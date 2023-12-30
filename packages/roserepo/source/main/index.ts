import inquirer from "inquirer";
import glob from "fast-glob";

import type {PackageJson} from "roserc";
import {loadPackage, loadConfig} from "roserc";

import {find, findDir, normalize, match} from "rosetil";

import {TreeOptions} from "~bin/commands/tree";
import {RunOptions} from "~bin/commands/run";
import {PublishOptions} from "~bin/commands/publish";
import {VersionOptions} from "~bin/commands/version";
import {UpgradeOptions} from "~bin/commands/upgrade";

import {findChildren, pathMatch} from "~shared/utils";

import {ChildrenFilter, RoserepoFilter, Filter} from "~shared/types";

import Logger, {logger} from "~shared/logger";

import Cache from "./cache";
import BaseCache, {BaseCacheConfig} from "./cache/base";

import Executor from "./executor";
import BaseExecutor, {BaseExecutorConfig} from "./executor/base";

import Runner from "./runner";
import BaseRunner, {BaseRunnerConfig} from "./runner/base";

import Publisher, {PublisherConfig} from "./publisher";
import Versioner, {VersionerConfig} from "./versioner";
import Upgrader, {UpgraderConfig} from "./upgrader";

import Plugin from "./plugin";

import path from "path";

interface Config {
  root?: boolean;
  env?: Record<string, string | number | boolean>;
  //
  runner?: Record<string, BaseRunner<unknown>>;
  executor?: Record<string, BaseExecutor<unknown>>;
  //
  include?: Filter;
  exclude?: Filter;
  //
  publisher?: PublisherConfig;
  versioner?: VersionerConfig;
  upgrader?: UpgraderConfig;
  //
  packageManager?: "npm" | "yarn" | "pnpm";
}

class Roserepo {
  first = false;

  initialized = false;

  cwd: string;

  config?: Config;
  packageJson?: PackageJson;

  parent?: Roserepo;
  children: Roserepo[] = [];

  logger: Logger;

  static cwd = async () => {
    return findDir({
      name: ["package.json", "roserepo.ts"],
      cwd: process.cwd(),
      traversal: "up",
    });
  };

  constructor(cwd: string) {
    this.cwd = normalize(cwd);
  }

  get name() {
    if (this.packageJson?.name) {
      return this.packageJson.name;
    }

    return path.basename(this.cwd);
  }

  get root(): Roserepo {
    if (this.config?.root) {
      return this;
    }

    if (this.parent) {
      return this.parent.root;
    }

    return this;
  }

  get isRoot() {
    return this.root === this;
  }

  get isFirst(): Roserepo {
    const first = this.root.resolveRoserepo("child", (roserepo) => {
      return roserepo.first;
    });

    if (!first) {
      return this;
    }

    return first;
  }

  get isMonorepo() {
    const hasWorkspaces = this.packageJson?.workspaces !== undefined;
    const hasChildren = this.children.length > 0;
    return hasWorkspaces && hasChildren;
  }

  get isMicrorepo() {
    return this.children.length > 0;
  }

  get isWorkspace() {
    return this.packageJson !== undefined;
  }

  get firstMonorepo() {
    return this.root.resolveRoserepo("child", (roserepo) => {
      return roserepo.isMonorepo;
    });
  }

  get firstMicrorepo() {
    return this.root.resolveRoserepo("child", (roserepo) => {
      return roserepo.isMicrorepo;
    });
  }

  //

  resolve = (...paths: string[]) => {
    return path.resolve(this.cwd, ...paths);
  };

  match = (filter?: Filter) => {
    const filters: RoserepoFilter[] = [];

    (Array.isArray(filter) ? filter : [filter]).forEach((filter) => {
      if (!filter) {
        return;
      }

      if (typeof filter === "string" || filter instanceof RegExp) {
        filters.push({
          type: "all",
          match: "name",
          pattern: filter,
        });
      } else {
        filters.push(filter);
      }
    });

    for (const filter of filters) {
      if (filter.type !== "all") {
        if (filter.type === "monorepo" && !this.isMonorepo) {
          return false;
        }

        if (filter.type === "microrepo" && !this.isMicrorepo) {
          return false;
        }

        if (filter.type === "workspace" && !this.isWorkspace) {
          return false;
        }
      }

      if (filter.match === "name") {
        return match(this.name, filter.pattern);
      }

      if (filter.match === "directory") {
        return match(path.basename(this.cwd), filter.pattern);
      }

      if (filter.match === "location") {
        return match(this.cwd, filter.pattern);
      }
    }

    return false;
  };

  //

  filter = (roserepos: Roserepo[], include?: Filter, exclude?: Filter) => {
    return roserepos.filter((roserepo) => {
      if (include) {
        return roserepo.match(include);
      }

      if (exclude) {
        if (roserepo.match(exclude)) {
          return false;
        }
      }

      return true;
    });
  };

  filterPriority = (roserepos: Roserepo[], filter?: Filter[][]) => {
    if (!filter || filter.length === 0) {
      return roserepos;
    }

    return roserepos.filter((roserepo) => {
      for (const [include, exclude] of filter) {
        const matchInclude = roserepo.match(include);

        if (matchInclude) {
          return true;
        }

        const matchExclude = roserepo.match(exclude);

        if (matchExclude) {
          return false;
        }
      }

      return true;
    });
  };

  filterChildren = (filter?: ChildrenFilter) => {
    filter = {
      type: "all",
      ...filter,
    };

    if (filter.monorepoDepth === undefined) {
      filter.monorepoDepth = Infinity;
    }

    if (filter.microrepoDepth === undefined) {
      filter.microrepoDepth = Infinity;
    }

    if (filter.workspaceDepth === undefined) {
      filter.workspaceDepth = Infinity;
    }

    const children: Roserepo[] = [];

    if (filter.monorepoDepth < 1 && filter.microrepoDepth < 1 && filter.workspaceDepth < 1) {
      return children;
    }

    for (const child of this.children) {
      if (filter.type === "all") {
        children.push(child);
      } else {
        if (filter.type === "monorepo" && child.isMonorepo) {
          children.push(child);
        } else if (filter.type === "microrepo" && child.isMicrorepo) {
          children.push(child);
        } else if (filter.type === "workspace" && child.isWorkspace) {
          children.push(child);
        }
      }

      if (child.isMonorepo) {
        if (filter.monorepoDepth > 1) {
          children.push(...child.filterChildren({
            ...filter,
            monorepoDepth: filter.monorepoDepth - 1,
          }));
        }

        continue;
      }

      if (child.isMicrorepo) {
        if (filter.microrepoDepth > 1) {
          children.push(...child.filterChildren({
            ...filter,
            microrepoDepth: filter.microrepoDepth - 1,
          }));
        }

        continue;
      }

      if (child.isWorkspace) {
        if (filter.workspaceDepth > 1) {
          children.push(...child.filterChildren({
            ...filter,
            workspaceDepth: filter.workspaceDepth - 1,
          }));
        }
      }
    }

    return children;
  };

  //

  resolveRoserepo = (traversal: "parent" | "child", condition: (roserepo: Roserepo) => boolean): (Roserepo | undefined) => {
    const isMatch = condition(this);

    if (isMatch) {
      return this;
    }

    if (traversal === "parent" && this.parent) {
      return this.parent.resolveRoserepo(traversal, condition);
    } else if (traversal === "child" && this.children.length) {
      for (const child of this.children) {
        const result = child.resolveRoserepo(traversal, condition);

        if (result) {
          return result;
        }
      }
    }

    return;
  };

  reduceParentRoserepo = <T>(reducer: (value: T, roserepo: Roserepo) => T, initialValue: T): T => {
    let value = initialValue;

    let roserepo: Roserepo | undefined = this;

    while (roserepo !== undefined) {
      value = reducer(value, roserepo);
      roserepo = roserepo.parent;
    }

    return value;
  };

  resolveConfig = (traversal: "parent" | "child", resolver: (config?: Config) => boolean): Config | undefined => {
    const isMatch = resolver(this.config);

    if (isMatch) {
      return this.config;
    }

    if (traversal === "parent" && this.parent) {
      return this.parent.resolveConfig(traversal, resolver);
    } else if (traversal === "child" && this.children.length) {
      for (const child of this.children) {
        const result = child.resolveConfig(traversal, resolver);

        if (result) {
          return result;
        }
      }
    }

    return;
  };

  reduceParentConfig = <T>(reducer: (value: T, roserepo: Roserepo) => T, initialValue: T): T => {
    let value = initialValue;

    let roserepo: Roserepo | undefined = this;

    while (roserepo !== undefined) {
      value = reducer(value, roserepo);
      roserepo = roserepo.parent;
    }

    return value;
  };

  //

  environmentVariables() {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([key, value]) => {
      env[key] = value.toString();
    });

    env = {
      ...this.parent?.environmentVariables() ?? {},
      ...env,
    };

    return env;
  }

  //

  private workspaces: string[];

  private resolveWorkspaces = (): string[] => {
    if (this.workspaces) {
      return this.workspaces;
    }

    if (!this.packageJson) {
      this.workspaces = [];
      return this.workspaces;
    }

    const workspaces = Array.isArray(this.packageJson.workspaces) ? this.packageJson.workspaces : this.packageJson.workspaces?.packages;

    if (!workspaces) {
      this.workspaces = [];
      return this.workspaces;
    }

    this.workspaces = glob.sync(workspaces, {
      cwd: this.cwd,
      unique: true,
      absolute: true,
      onlyDirectories: true,
      followSymbolicLinks: false,
      ignore: [
        "**/node_modules/**",
      ],
    });

    return this.workspaces;
  };

  private initParent = async () => {
    if (this.parent || this.config?.root) {
      return;
    }

    const cwd = await findDir({
      cwd: path.dirname(this.cwd),
      name: ["package.json", "roserepo.ts"],
      traversal: "up",
    });

    if (!cwd) {
      return;
    }

    this.parent = new Roserepo(cwd);

    this.parent.children = [this];

    return this.parent.init();
  };

  private initChildren = async () => {
    let dirs = findChildren(this.cwd, this.root.resolveWorkspaces());

    if (dirs.length === 0) {
      return;
    }

    dirs = dirs.filter((dir) => {
      return !this.children.find((child) => {
        return pathMatch(child.cwd, dir);
      });
    });

    for (const dir of dirs) {
      const child = new Roserepo(dir);
      child.parent = this;
      this.children.push(child);
    }

    return Promise.all(this.children.map((child) => {
      return child.init();
    }));
  };

  init = async () => {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    const configFile = await find({
      cwd: this.cwd,
      name: "roserepo.ts",
      traversal: "none",
    });

    if (configFile) {
      this.config = await loadConfig(configFile);
    }

    const packageJsonFile = await find({
      cwd: this.cwd,
      name: "package.json",
      traversal: "none",
    });

    if (packageJsonFile) {
      this.packageJson = await loadPackage(packageJsonFile);
    }

    await this.initParent();
    await this.initChildren();

    this.logger = new Logger({
      name: this.name,
      color: Logger.uniqueColor(),
      symbol: Logger.resolveSymbol(this),
    });
  };

  //

  getRunner = (script: string) => {
    const runner = this.config?.runner?.[script];

    if (!runner) {
      return;
    }

    runner.roserepo = this;

    return runner;
  };

  hasRunner = (script: string) => {
    return Reflect.has(this.config?.runner ?? {}, script);
  };

  //

  getExecutor = (script: string) => {
    let executor = this.config?.executor?.[script];

    if (!executor) {
      if (this.packageJson?.scripts?.[script]) {
        executor = Executor.script({
          script,
        });
      }

      if (!executor) {
        return;
      }
    }

    executor.roserepo = this;

    return executor;
  };

  hasExecutor = (script: string) => {
    const hasExecutor = Reflect.has(this.config?.executor ?? {}, script);
    const hasScript = Reflect.has(this.packageJson?.scripts ?? {}, script);
    return (hasExecutor || hasScript);
  };

  //

  tree = async (options: TreeOptions, depth = 0) => {
    const arrow = Array(depth).fill(" ").join("") + "└─";

    console.log(arrow, this.logger.mark(this.name), this.logger.mark(path.relative(this.root.cwd, this.cwd)));

    this.children.forEach((child) => {
      child.tree(options, depth + 1);
    });
  };

  run = async (script: string, options: RunOptions, rootRunner?: BaseRunner<unknown>) => {
    const runner = this.getRunner(script);

    if (runner) {
      runner.roserepos = this.filterChildren({
        type: "all",
        monorepoDepth: 1,
        microrepoDepth: 1,
      }).filter((roserepo) => {
        const include = [];

        if (roserepo.isMicrorepo && roserepo.hasRunner(script)) {
          include.push(true);
        }

        if (roserepo.isWorkspace && roserepo.hasExecutor(script)) {
          include.push(true);
        }

        return include.length > 0;
      });

      runner.rootRunner = rootRunner;

      runner.init(script, options);

      return runner.run();
    }

    const executor = this.getExecutor(script);

    if (executor) {
      executor.init(script, options, rootRunner);

      if (!options.cache) {
        return executor.execute();
      }

      const caches: BaseCache<any>[] = [];

      const runnerCache = rootRunner?.config.cache;
      const executorCache = executor.config.cache;

      if (runnerCache) {
        caches.push(runnerCache.clone());
      }

      if (executorCache) {
        caches.push(executorCache.clone());
      }

      if (caches.length > 0) {
        const timer = this.logger.timer();

        const cache = Cache.multi({
          caches,
        });

        cache.init(this, script, options);

        const match = await cache.compare();

        if (match) {
          return this.logger.info(`Skipping ${this.logger.mark(script)}, cache hit`);
        }

        this.logger.info("Executing task, cache miss");

        await executor.execute();
        await cache.saveHash();

        this.logger.info(`Cached in ${timer.end()}ms`);

        return;
      }

      return executor.execute();
    }

    this.logger.warn(`No runner or executor for script ${this.logger.mark(script)}`);
  };

  publish = async (options: PublishOptions) => {
    const roserepos = Publisher.getRoserepos(this, options);

    if (roserepos.length === 0) {
      return logger.warn("No roserepo to publish");
    }

    const {selectedRoserepos} = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
      type: "checkbox",
      name: "selectedRoserepos",
      prefix: logger.config.symbol,
      message: logger.format("Select to publish"),
      choices: roserepos.map((roserepo) => ({
        checked: roserepo === this,
        name: `${roserepo.name} ${this.logger.mark(roserepo.packageJson?.version)}`,
        value: roserepo,
      })),
    });

    if (selectedRoserepos.length === 0) {
      return logger.info("No roserepo to publish");
    }

    this.logger.line();

    for (const roserepo of selectedRoserepos) {
      const publisher = new Publisher(roserepo, options);
      await publisher.publish();
    }
  };

  version = async (options: VersionOptions) => {
    const roserepos = Versioner.getRoserepos(this, options);

    if (roserepos.length === 0) {
      return logger.warn("No roserepo to version");
    }

    const {selectedRoserepos} = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
      type: "checkbox",
      name: "selectedRoserepos",
      prefix: logger.config.symbol,
      message: logger.format("Select to version"),
      choices: roserepos.map((roserepo) => ({
        checked: roserepo === this,
        name: `${roserepo.name} ${this.logger.mark(roserepo.packageJson?.version)}`,
        value: roserepo,
      })),
    });

    if (selectedRoserepos.length === 0) {
      return logger.info("No roserepo to version");
    }

    this.logger.line();

    for (const roserepo of selectedRoserepos) {
      const versioner = new Versioner(roserepo, options);
      await versioner.version();
    }
  };

  upgrade = async (options: UpgradeOptions) => {
    const roserepos = Upgrader.getRoserepos(this, options);

    if (roserepos.length === 0) {
      return logger.warn("No roserepo to upgrade");
    }

    const {selectedRoserepos} = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
      type: "checkbox",
      name: "selectedRoserepos",
      prefix: logger.config.symbol,
      message: logger.format("Select to upgrade"),
      choices: roserepos.map((roserepo) => ({
        checked: roserepo === this,
        name: roserepo.name,
        value: roserepo,
      })),
    });

    if (selectedRoserepos.length === 0) {
      return logger.info("No roserepo to upgrade");
    }

    this.logger.line();

    for (const roserepo of selectedRoserepos) {
      const upgrader = new Upgrader(roserepo, options);
      await upgrader.upgrade();
    }
  };
}

const defineRoserepo = (config: Config | ((config: Config) => Config)) => {
  return config;
};

export type {
  Config,
};

export {
  defineRoserepo,
};

export {
  logger,
  Logger,
};

export type {
  BaseCacheConfig,
  BaseExecutorConfig,
  BaseRunnerConfig,
};

export {
  Cache,
  BaseCache,
  Executor,
  BaseExecutor,
  Runner,
  BaseRunner,
};

export {
  Plugin,
};

export default Roserepo;