import axios, {AxiosError} from "axios";

import semver from "semver";
import inquirer from "inquirer";
import picomatch from "picomatch";

import {UpgradeOptions} from "~bin/commands/upgrade";

import Roserepo from "~/main";

import {Filter} from "~shared/types";

import fs from "fs";


interface Dependency {
  place: "dependencies" | "devDependencies" | "peerDependencies";
  name: string;
  version: string;
  peerVersion?: string;
  targetVersion: string | null;
}

interface UpgraderConfig {
  include?: Filter;
  exclude?: Filter;
  //
  upgradeDependencies?: boolean;
  upgradeDevDependencies?: boolean;
  //
  includeDependencies?: string | string[];
  excludeDependencies?: string | string[];
}

const cache = new Map<string, string[]>();

const fetchVersions = async (name: string) => {
  try {
    if (cache.has(name)) {
      return cache.get(name);
    }

    const {data} = await axios.get(`https://registry.npmjs.org/${name}`);

    const versions = Object.keys(data.versions);

    cache.set(name, versions);

    return versions;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch versions for ${name}: ${error.message}`);
    }

    throw error;
  }
};

const canBeUpgraded = (roserepo: Roserepo) => {
  if (!roserepo.packageJson) {
    return false;
  }

  const dependencies = Object.keys(roserepo.packageJson.dependencies ?? {});
  const devDependencies = Object.keys(roserepo.packageJson.devDependencies ?? {});

  return dependencies.length > 0 || devDependencies.length > 0;
};

class Upgrader {
  roserepo: Roserepo;
  options: UpgradeOptions;

  static getRoserepos = (roserepo: Roserepo, options: UpgradeOptions): Roserepo[] => {
    const roserepos: Roserepo[] = [];

    if (roserepo.isMicrorepo) {
      const filter = roserepo.reduceParentConfig<Filter[][]>((filter, roserepo) => {
        let include = roserepo.config?.upgrader?.include ?? [] as any;
        let exclude = roserepo.config?.upgrader?.exclude ?? [] as any;

        if (!Array.isArray(include)) {
          include = [include];
        }

        if (!Array.isArray(exclude)) {
          exclude = [exclude];
        }

        if (include.length === 0 && exclude.length === 0) {
          return filter;
        }

        filter.push([include, exclude]);

        return filter;
      }, []);

      const children = roserepo.filterChildren({
        monorepoDepth: 1,
        microrepoDepth: 1,
        workspaceDepth: 1,
      });

      const filteredChildren = roserepo.filterPriority(children, filter);

      for (const child of filteredChildren) {
        roserepos.push(...this.getRoserepos(child, options));
      }
    }

    if (canBeUpgraded(roserepo)) {
      roserepos.unshift(roserepo);
    }

    return roserepos;
  };

  get config() {
    return this.roserepo.config?.upgrader;
  }

  get logger() {
    return this.roserepo.logger;
  }

  get canUpgradeDependencies() {
    const upgradeDependencies = this.roserepo.resolveConfig("parent", (config) => {
      return config?.upgrader?.upgradeDependencies !== undefined;
    })?.upgrader?.upgradeDependencies;

    if (upgradeDependencies === undefined) {
      return true;
    }

    return upgradeDependencies;
  }

  get canUpgradeDevDependencies() {
    const upgradeDevDependencies = this.roserepo.resolveConfig("parent", (config) => {
      return config?.upgrader?.upgradeDevDependencies !== undefined;
    })?.upgrader?.upgradeDevDependencies;

    if (upgradeDevDependencies === undefined) {
      return true;
    }

    return upgradeDevDependencies;
  }

  constructor(roserepo: Roserepo, options: UpgradeOptions) {
    this.roserepo = roserepo;
    this.options = options;
  }

  objectToArray = (object: Partial<Record<string, string>>, place: Dependency["place"]): Dependency[] => {
    return Object.entries(object).map(([name, version]) => ({
      name,
      place,
      version: version ?? "*",
      peerVersion: this.roserepo.packageJson?.peerDependencies?.[name],
      targetVersion: null,
    }));
  };

  loadDependencies = (): Dependency[] => {
    const dependencies: Dependency[] = [];

    if (this.canUpgradeDependencies) {
      dependencies.push(...this.objectToArray(this.roserepo.packageJson?.dependencies ?? {}, "dependencies"));
    }

    if (this.canUpgradeDevDependencies) {
      dependencies.push(...this.objectToArray(this.roserepo.packageJson?.devDependencies ?? {}, "devDependencies"));
    }

    const filterDependencies = this.roserepo.reduceParentConfig<(string | string[])[][]>((filter, roserepo) => {
      const includeDependencies = roserepo.config?.upgrader?.includeDependencies ?? [];
      const excludeDependencies = roserepo.config?.upgrader?.excludeDependencies ?? [];

      if (includeDependencies.length === 0 && excludeDependencies.length === 0) {
        return filter;
      }

      filter.push([includeDependencies, excludeDependencies]);

      return filter;
    }, []);

    const filter = (dependency: Dependency) => {
      let result = true;

      for (const [includeGroup, excludeGroup] of filterDependencies) {
        if (includeGroup) {
          const patterns = Array.isArray(includeGroup) ? includeGroup : [includeGroup];

          if (patterns.length === 0) {
            continue;
          }

          result = picomatch.isMatch(dependency.name, patterns);

          break;
        }

        if (excludeGroup) {
          const patterns = Array.isArray(excludeGroup) ? excludeGroup : [excludeGroup];

          if (patterns.length === 0) {
            continue;
          }

          result = !picomatch.isMatch(dependency.name, patterns);

          break;
        }
      }

      return result;
    };

    const workspaces = this.roserepo.root.filterChildren({
      type: "workspace",
    });

    return dependencies.filter((dependency) => {
      if (workspaces.some((workspace) => workspace.packageJson?.name === dependency.name)) {
        return false;
      }

      if (semver.validRange(dependency.version) === null) {
        return false;
      }

      if (filterDependencies.length === 0) {
        return true;
      }

      return filter(dependency);
    });
  };

  checkDependencies = async (dependencies: Dependency[]) => {
    if (dependencies.length === 0) {
      return [];
    }

    const promises = dependencies.map(async (dependency): Promise<Dependency> => {
      let range = new semver.Range(dependency.peerVersion ?? dependency.version);

      if (range.set.flat().every((set) => set.operator === "")) {
        range = new semver.Range("*");
      }

      if (!range) {
        throw new Error(`Invalid range: ${dependency.peerVersion ?? dependency.version} for ${dependency.name}`);
      }

      const availableVersions = await fetchVersions(dependency.name);

      let targetVersion = semver.maxSatisfying(availableVersions ?? [], range);

      if (targetVersion) {
        const installedVersion = semver.coerce(dependency.version);

        if (installedVersion && semver.eq(targetVersion, installedVersion)) {
          return dependency;
        }

        if (dependency.version && !dependency.peerVersion) {
          if (dependency.version.startsWith("~") || dependency.version.startsWith("^")) {
            targetVersion = dependency.version[0] + targetVersion;
          }
        }
      }

      return {
        ...dependency,
        targetVersion,
      };
    });

    const promisesSettled = (await Promise.allSettled(promises)).filter((promises) => {
      if (promises.status === "rejected") {
        this.logger.warn(promises.reason);
        return false;
      }

      if (promises.status === "fulfilled" && promises.value.targetVersion === null) {
        return false;
      }

      return promises.status === "fulfilled";
    });

    return promisesSettled.map((promise: any) => promise.value as Dependency);
  };

  upgrade = async () => {
    try {
      this.logger.info("Fetching dependencies");

      const dependencies = this.loadDependencies();

      const dependenciesToUpgrade = await this.checkDependencies(dependencies);

      if (dependenciesToUpgrade.length === 0) {
        return this.logger.info("No dependencies to upgrade");
      }

      for (const dependency of dependenciesToUpgrade) {
        this.logger.info(`${this.logger.mark([dependency.name, "@", dependency.version].join(""))} -> ${this.logger.mark(dependency.targetVersion)}`);
      }

      let yesToAll = false;

      for (const dependency of dependenciesToUpgrade) {
        let upgrade = yesToAll;

        if (!upgrade) {
          const {accept} = await inquirer.prompt({
            type: "list",
            name: "accept",
            prefix: this.logger.config.symbol,
            message: this.logger.format(`Upgrade ${this.logger.mark(dependency.name)} from ${this.logger.mark(dependency.version)} to ${this.logger.mark(dependency.targetVersion)}?`),
            loop: false,
            choices: [
              {
                name: "Yes",
                value: "yes",
              },
              {
                name: "No",
                value: "no",
              },
              {
                name: "Yes to all",
                value: "yesToAll",
              },
              {
                name: "No to all",
                value: "noToAll",
              },
            ],
          });

          if (accept === "yes") {
            upgrade = true;
          }

          if (accept === "no") {
            continue;
          }

          if (accept === "yesToAll") {
            yesToAll = true;
          }

          if (accept === "noToAll") {
            break;
          }
        }

        if (upgrade) {
          if (dependency.place === "dependencies" && this.roserepo.packageJson?.dependencies && dependency.targetVersion) {
            this.roserepo.packageJson.dependencies[dependency.name] = dependency.targetVersion;
          }

          if (dependency.place === "devDependencies" && this.roserepo.packageJson?.devDependencies && dependency.targetVersion) {
            this.roserepo.packageJson.devDependencies[dependency.name] = dependency.targetVersion;
          }
        }
      }

      await fs.promises.writeFile(this.roserepo.resolve("package.json"), JSON.stringify(this.roserepo.packageJson, null, 2));

      this.logger.info("Dependencies upgraded");
    } catch (error) {
      this.logger.error(error);
    }
  };
}

export type {
  UpgraderConfig,
};

export default Upgrader;