import semver from "semver";

import fetchNpmRegistry from "npm-registry-fetch";

import checkbox from "@inquirer/checkbox";

import {ProgressBar} from "@opentf/cli-pbar";

import {UpgradeOptions} from "~/commands/upgrade";

import {Module} from "~/domain/module";

import {PatternFilter, PriorityPatternFilter, PatternFilterConfig} from "~/utils/filter";

import {logger} from "~/shared/logger";

interface Dependency {
  name: string;
  version: string;
  peerVersion?: string;
  target?: string;
}

interface UpgradeContext {
  dependencies: Dependency[];
  devDependencies: Dependency[];
}

interface UpgraderConfig {
  latest?: boolean;
  //
  dependencies?: PatternFilterConfig;
  devDependencies?: PatternFilterConfig;
}

const cache = new Map<string, string[]>();

abstract class Upgrader<Config extends UpgraderConfig> {
  module: Module;
  config?: Config;
  options?: UpgradeOptions;

  protected constructor(module: Module, config?: Config, options?: UpgradeOptions) {
    this.module = module;
    this.config = config;
    this.options = options;
  }

  protected isVersionUpgradable = (version: string): boolean => {
    if (!semver.validRange(version)) {
      return false;
    }

    return version !== "*";
  };

  filterDependencies = (dependencies?: Record<string, string>, ...dependencyFilter: PatternFilterConfig[]): Dependency[] => {
    if (!dependencies) {
      return [];
    }

    const patternFilter = new PriorityPatternFilter(
      ...dependencyFilter.map((config) => new PatternFilter(config)),
    );

    const filtered = Object.entries(dependencies).filter(([name, version]) => {
      if (!patternFilter.match(name)) {
        return false;
      }

      return this.isVersionUpgradable(version);
    });

    return filtered.map(([name, version]) => {
      let peerVersion = semver.validRange(this.module.packageJson.peerDependencies?.[name]);

      return ({
        name,
        version,
        peerVersion,
      });
    });
  };

  fetchDependency = async (dependency: Dependency): Promise<Dependency> => {
    let versions = cache.get(dependency.name);

    if (!versions) {
      await fetchNpmRegistry.json(`/${dependency.name}`).then((data) => {
        versions = Object.keys(data.versions);
        cache.set(dependency.name, versions);
      });
    }

    let range: semver.Range;

    if (this.config?.latest || this.options?.latest) {
      range = new semver.Range("*");
    } else {
      range = new semver.Range(dependency.peerVersion ?? dependency.version);
    }

    if (range.set.flat().every((set) => set.operator === "")) {
      range = new semver.Range("*");
    }

    let targetVersion = semver.maxSatisfying(versions ?? [], range);

    if (!targetVersion) {
      return dependency;
    }

    const installedVersion = semver.coerce(dependency.version);

    if (installedVersion && semver.eq(targetVersion, installedVersion)) {
      return dependency;
    }

    if (dependency.version && !dependency.peerVersion) {
      if (dependency.version.startsWith("~") || dependency.version.startsWith("^")) {
        targetVersion = dependency.version[0] + targetVersion;
      }
    }

    dependency.target = targetVersion;

    return dependency;
  };

  protected upgrade = async (context: UpgradeContext) => {
    this.module.logger.info(`Upgrading ${this.module.logger.mark(this.module.name)}`);

    const {dependencies, devDependencies} = context;

    const progressBar = new ProgressBar({
      prefix: this.module.logger.prefix(),
      autoClear: true,
    });

    progressBar.start({
      total: dependencies.length + devDependencies.length,
    });

    let dependenciesToUpgrade: Dependency[] = [];
    let devDependenciesToUpgrade: Dependency[] = [];

    for (let dependency of dependencies) {
      dependency = await this.fetchDependency(dependency);

      if (dependency.target) {
        dependenciesToUpgrade.push(dependency);
      }

      progressBar.inc();
    }

    for (let dependency of devDependencies) {
      dependency = await this.fetchDependency(dependency);

      if (dependency.target) {
        devDependenciesToUpgrade.push(dependency);
      }

      progressBar.inc();
    }

    progressBar.stop();

    if (!dependenciesToUpgrade.length && !devDependenciesToUpgrade.length) {
      this.module.logger.info("No dependencies to upgrade").line();
      return;
    }

    if (dependenciesToUpgrade.length) {
      dependenciesToUpgrade = await checkbox({
        prefix: this.module.logger.prefix(),
        message: "Select dependencies to upgrade",
        choices: dependenciesToUpgrade.map((dependency) => ({
          name: `${dependency.name}@${dependency.version} -> ${logger.mark(dependency.target)}`,
          value: dependency,
          checked: true,
        })),
      });

      dependenciesToUpgrade.forEach((dependency) => {
        this.module.packageJson.dependencies[dependency.name] = dependency.target;
      });
    }

    if (devDependenciesToUpgrade.length) {
      devDependenciesToUpgrade = await checkbox({
        prefix: this.module.logger.prefix(),
        message: "Select devDependencies to upgrade",
        choices: devDependenciesToUpgrade.map((dependency) => ({
          name: `${dependency.name} -> ${logger.mark(dependency.target)}`,
          value: dependency,
          checked: true,
        })),
      });

      devDependenciesToUpgrade.forEach((dependency) => {
        this.module.packageJson.devDependencies[dependency.name] = dependency.target;
      });
    }

    if (dependenciesToUpgrade.length || devDependenciesToUpgrade.length) {
      await this.module.savePackageJson();
    }
  };

  abstract run: () => Promise<void>;
}

export type {
  Dependency,
  UpgraderConfig,
};

export default Upgrader;
