import inquirer from "inquirer";

import micromatch from "micromatch";
import glob from "fast-glob";

//
import type { RunOptions } from "~bin/commands/run";
import type { UpgradeOptions } from "~bin/commands/upgrade";
import type { PublishOptions } from "~bin/commands/publish";
import type { ChangesetOptions } from "~bin/commands/changeset";

import RoserepoError from "~shared/error";

import Logger, { logger } from "~shared/logger";

import { loadConfig, loadPackageJson, loadTsConfig } from "~shared/loader";
import { pathMatch, findChildren, findRoot } from "~shared/utils";

//
import type { MonorepoConfig } from "./monorepo";
import { defineMonorepo } from "./monorepo";
import type { BaseRunnerConfig } from "./monorepo/runner/base";
import BaseRunner from "./monorepo/runner/base";
import Runner from "./monorepo/runner";

//
import type { WorkspaceConfig } from "./workspace";
import { defineWorkspace } from "./workspace";
import type { BaseExecutorConfig } from "./workspace/executor/base";
import BaseExecutor from "./workspace/executor/base";
import Executor from "./workspace/executor";

import Publisher from "./workspace/publisher";
import Changeseter from "./workspace/changeseter";
import Upgrader from "~workspace/upgrader";

//
import type { BaseCacheConfig } from "./common/cache/base";
import BaseCache from "./common/cache/base";
import Cache from "./common/cache";

import type { PackageJson, TsConfig, RoserepoFilter } from "~/types";

import path from "path";

interface ChildrenFilter {
  type?: "monorepo" | "workspace" | "all";
  monorepoDepth?: number;
  workspaceDepth?: number;
  ignoreEmpty?: boolean;
}

interface Config {
  root?: boolean;
  env?: {
    [variable: string]: string | number | boolean;
  };
  //
  monorepo?: MonorepoConfig;
  workspace?: WorkspaceConfig;
  //
  packageManager?: "yarn" | "npm";
}

class Roserepo {
  cwd: string;

  config?: Config;

  packageJson?: PackageJson;
  tsConfig?: TsConfig;

  parent?: Roserepo;
  children?: Roserepo[];

  logger: Logger;
  private workspaces: string[] | undefined;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  //

  get name(): string {
    return this.packageJson?.name ?? path.basename(this.cwd);
  }

  get root(): Roserepo {
    if ( this.isRoot ) {
      return this;
    }

    if ( this.parent ) {
      return this.parent.root;
    }

    throw new RoserepoError("Root not found");
  }

  get isRoot(): boolean {
    return this.config?.root ?? false;
  }

  //

  get isMonorepo(): boolean {
    if ( this.config?.monorepo !== undefined ) {
      return true;
    }

    return this.packageJson?.workspaces !== undefined;
  }

  //

  get isWorkspace(): boolean {
    if ( this.config?.workspace !== undefined ) {
      return true;
    }

    return this.packageJson !== undefined;
  }

  //

  get nearestMonorepo(): (Roserepo | undefined) {
    if ( !this.parent ) {
      return;
    }

    if ( this.parent.isMonorepo ) {
      return this.parent;
    }

    return this.parent.nearestMonorepo;
  }

  get environmentVariables(): Record<string, string> {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([ key, value ]) => {
      env[key] = value.toString();
    });

    if ( this.parent ) {
      env = {
        ...this.parent.environmentVariables,
        ...env,
      };
    }

    return env;
  }

  //

  findRoserepo = (condition: (roserepo: Roserepo) => boolean, traversal?: "parent" | "child"): (Roserepo | undefined) => {
    traversal ??= "child";

    const isMatch = condition(this);

    if ( isMatch ) {
      return this;
    }

    if ( traversal === "parent" && this.parent ) {
      return this.parent.findRoserepo(condition, traversal);
    } else if ( traversal === "child" && this.children ) {
      for ( const child of this.children ) {
        const result = child.findRoserepo(condition, traversal);

        if ( result ) {
          return result;
        }
      }
    }

    return;
  };

  //

  getChildren = (filter: ChildrenFilter): Roserepo[] => {
    let { type, monorepoDepth, workspaceDepth, ignoreEmpty } = filter;

    if ( type === undefined ) {
      type = "all";
    }

    if ( monorepoDepth === undefined ) {
      monorepoDepth = 0;
    }

    if ( workspaceDepth === undefined ) {
      workspaceDepth = 0;
    }

    if ( ignoreEmpty === undefined ) {
      ignoreEmpty = true;
    }

    const children: Roserepo[] = [];

    if ( monorepoDepth < 1 && workspaceDepth < 1 ) {
      return children;
    }

    for ( const child of (this.children ?? []) ) {
      if ( type === "all" ) {
        children.push(child);
      } else if ( type === "monorepo" && child.isMonorepo ) {
        children.push(child);
      } else if ( type === "workspace" && child.isWorkspace ) {
        children.push(child);
      }

      if ( child.isMonorepo ) {
        const newMonorepoDepth = monorepoDepth - 1;

        if ( newMonorepoDepth < 1 ) {
          continue;
        }

        children.push(...child.getChildren({
          type,
          monorepoDepth: newMonorepoDepth,
          workspaceDepth: workspaceDepth,
          ignoreEmpty,
        }));

        continue;
      }

      if ( child.isWorkspace ) {
        const newWorkspaceDepth = workspaceDepth - 1;

        if ( newWorkspaceDepth < 1 ) {
          continue;
        }

        children.push(...child.getChildren({
          type,
          monorepoDepth: monorepoDepth,
          workspaceDepth: workspaceDepth - 1,
          ignoreEmpty,
        }));

        continue;
      }

      children.push(...child.getChildren({
        type,
        monorepoDepth: monorepoDepth,
        workspaceDepth: workspaceDepth,
        ignoreEmpty,
      }));
    }

    if ( ignoreEmpty ) {
      return children.filter((child) => {
        return child.isMonorepo || child.isWorkspace;
      });
    }

    return children;
  };

  applyFilter = (roserepos: Roserepo[], include?: string | RegExp | RoserepoFilter[], exclude?: string | RegExp | RoserepoFilter[]): Roserepo[] => {
    let includeFilters: RoserepoFilter[] = [];
    let excludeFilters: RoserepoFilter[] = [];

    if ( include ) {
      if ( Array.isArray(include) ) {
        includeFilters = include.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        includeFilters.push({
          type: "all",
          match: "name",
          pattern: include,
        });
      }
    }

    if ( exclude ) {
      if ( Array.isArray(exclude) ) {
        excludeFilters = exclude.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        excludeFilters.push({
          type: "all",
          match: "name",
          pattern: exclude,
        });
      }
    }

    return roserepos.filter((roserepo) => {
      if ( includeFilters.length ) {
        return includeFilters.some((filter) => {
          return roserepo.match(filter);
        });
      }

      if ( excludeFilters.length ) {
        return !excludeFilters.some((filter) => {
          return roserepo.match(filter);
        });
      }

      return true;
    });
  };

  //

  resolve = (...paths: string[]) => {
    return path.resolve(this.cwd, ...paths);
  };

  match = (filter: RoserepoFilter) => {
    if ( filter.type !== "all" ) {
      if ( filter.type === "monorepo" && !this.isMonorepo ) {
        return false;
      }

      if ( filter.type === "workspace" && !this.isWorkspace ) {
        return false;
      }
    }

    if ( filter.match === "name" ) {
      if ( typeof filter.pattern === "string" ) {
        return micromatch.isMatch(this.name, filter.pattern);
      }

      return filter.pattern.test(this.name);
    }

    if ( filter.match === "directory" ) {
      const directory = path.relative(this.root.cwd, this.cwd);

      if ( typeof filter.pattern === "string" ) {
        return micromatch.isMatch(directory, filter.pattern);
      }

      return filter.pattern.test(directory);
    }

    if ( filter.match === "location" ) {
      if ( typeof filter.pattern === "string" ) {
        return micromatch.isMatch(this.cwd, filter.pattern);
      }

      return filter.pattern.test(this.cwd);
    }

    throw new RoserepoError(`Unknown filter match type: ${ filter.match }`);
  };

  getWorkspaces = () => {
    if ( this.workspaces ) {
      return this.workspaces;
    }

    if ( !this.packageJson ) {
      return;
    }

    const workspaces = Array.isArray(this.packageJson.workspaces) ? this.packageJson.workspaces : this.packageJson.workspaces?.packages;

    if ( !workspaces ) {
      if ( this.isRoot && this.isMonorepo ) {
        throw new RoserepoError("No workspaces found in root package.json");
      }

      return;
    }

    if ( !Array.isArray(workspaces) ) {
      if ( this.isRoot && this.isMonorepo ) {
        throw new RoserepoError("No workspaces found in root package.json");
      }

      return;
    }

    this.workspaces = glob.sync(workspaces, {
      cwd: this.cwd,
      unique: true,
      absolute: true,
      onlyDirectories: true,
      followSymbolicLinks: false,
      dot: false,
      ignore: [
        "**/node_modules/**",
      ],
    });

    return this.workspaces;
  };

  getRunner = (script: string) => {
    const runner = this.config?.monorepo?.runner?.[script];

    if ( !runner ) {
      return;
    }

    runner.roserepo = this;

    return runner;
  };

  //

  hasRunner = (script: string) => {
    return this.getRunner(script) !== undefined;
  };

  getExecutor = (script: string): BaseExecutor<unknown> => {
    let executor = this.config?.workspace?.executor?.[script];

    if ( !executor ) {
      executor = Executor.script({
        script,
      });
    }

    executor.roserepo = this;

    return executor;
  };

  //

  hasExecutor = (script: string) => {
    const hasExecutor = Reflect.has(this.config?.workspace?.executor ?? {}, script);
    const hasScript = Reflect.has(this.packageJson?.scripts ?? {}, script);

    return hasExecutor || hasScript;
  };

  //

  init = async () => {
    this.config = await loadConfig(this.cwd);

    if ( this.isRoot ) {
      if ( this.parent ) {
        throw new RoserepoError("Root can only be defined once");
      }
    }

    await this.loadParent();

    this.packageJson = loadPackageJson(this.cwd);
    this.tsConfig = await loadTsConfig(this.cwd);

    this.createLogger();

    await this.loadChildren();
  };

  run = async (script: string, options: RunOptions, runner?: BaseRunner<unknown>) => {
    if ( this.isMonorepo ) {
      const childRunner = this.getRunner(script);

      if ( !childRunner ) {
        throw new RoserepoError(`Runner for script ${ logger.mark(script) } not found`);
      }

      childRunner.roserepos = this.getChildren({
        workspaceDepth: Infinity,
      }).filter((roserepo) => {
        if ( options.scope && !options.scope.includes(roserepo.name) ) {
          return false;
        }

        if ( roserepo.isMonorepo ) {
          return roserepo.hasRunner(script);
        }

        return roserepo.hasExecutor(script);
      });

      if ( childRunner.config.runSelf ) {
        childRunner.roserepos.unshift(this);
      }

      childRunner.rootRunner = runner;

      childRunner.init(script, options);

      return childRunner.run();
    }

    if ( this.isWorkspace ) {
      const executor = this.getExecutor(script);

      if ( !executor ) {
        throw new RoserepoError(`Executor for script ${ logger.mark(script) } not found`);
      }

      executor.init(script, options, runner);

      if ( !options.cache ) {
        return executor.execute();
      }

      const caches: BaseCache<any>[] = [];

      const runnerCache = runner?.getCache();
      const executorCache = executor.getCache();

      if ( runnerCache ) {
        caches.push(runnerCache.clone());
      }

      if ( executorCache ) {
        caches.push(executorCache.clone());
      }

      if ( caches.length > 0 ) {
        const cache = Cache.multi({
          caches,
        });

        cache.init(this, script, options);

        const match = await cache.compare();

        if ( match ) {
          return this.logger.info("Skipping execution, cache hit");
        }

        this.logger.info("Executing task, cache miss");

        await executor.execute();
        await cache.saveHash();

        return;
      }

      return executor.execute();
    }

    throw new RoserepoError(`Cannot run script ${ logger.mark(script) } in empty roserepo`);
  };

  publish = async (options: PublishOptions, skipMonorepo = false) => {
    if ( !skipMonorepo && this.isMonorepo ) {
      const children = this.getChildren({
        monorepoDepth: 1,
        workspaceDepth: Infinity,
      });

      const canPublish = (roserepo: Roserepo) => {
        return roserepo.packageJson?.version !== undefined && roserepo.packageJson?.private !== true;
      };

      const filteredChildren = this.applyFilter(children, this.config?.monorepo?.changeset?.include, this.config?.monorepo?.changeset?.exclude).filter(canPublish);

      if ( this.isWorkspace && canPublish(this) ) {
        filteredChildren.unshift(this);
      }

      if ( filteredChildren.length === 0 ) {
        return logger.info("No workspaces to publish");
      }

      const { selectedRoserepos } = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
        type: "checkbox",
        name: "selectedRoserepos",
        prefix: logger.config.symbol,
        message: logger.format("Select to publish"),
        choices: filteredChildren.map((roserepo) => {
          return {
            checked: false,
            name: `${ roserepo.name } - ${ roserepo.packageJson?.version }`,
            value: roserepo,
          };
        }),
      });

      logger.line();

      for ( const selectedRoserepo of selectedRoserepos ) {
        await selectedRoserepo.publish(options, selectedRoserepo.cwd === this.cwd);
      }

      return;
    }

    if ( this.isWorkspace ) {
      const publisher = new Publisher(this);
      return publisher.publish();
    }

    throw new RoserepoError("Cannot publish an empty roserepo");
  };

  changeset = async (options: ChangesetOptions, skipMonorepo = false) => {
    if ( !skipMonorepo && this.isMonorepo ) {
      const children = this.getChildren({
        monorepoDepth: 1,
        workspaceDepth: Infinity,
      });

      const canChangeset = (roserepo: Roserepo) => {
        return roserepo.packageJson?.version;
      };

      const filteredChildren = this.applyFilter(children, this.config?.monorepo?.changeset?.include, this.config?.monorepo?.changeset?.exclude).filter(canChangeset);

      if ( this.isWorkspace && canChangeset(this) ) {
        filteredChildren.unshift(this);
      }

      if ( filteredChildren.length === 0 ) {
        return logger.info("No workspaces to changeset");
      }

      const { selectedRoserepos } = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
        type: "checkbox",
        name: "selectedRoserepos",
        prefix: logger.config.symbol,
        message: logger.format("Select to changeset"),
        choices: filteredChildren.map((roserepo) => {
          return {
            checked: false,
            name: `${ roserepo.name } - ${ roserepo.packageJson?.version }`,
            value: roserepo,
          };
        }),
      });

      logger.line();

      for ( const selectedRoserepo of selectedRoserepos ) {
        await selectedRoserepo.changeset(options, selectedRoserepo.cwd === this.cwd);
      }

      return;
    }

    if ( this.isWorkspace ) {
      const changeseter = new Changeseter(this);

      return changeseter.changeset();
    }

    throw new RoserepoError("Cannot changeset an empty roserepo");
  };

  //

  upgrade = async (options: UpgradeOptions, parent?: Roserepo) => {
    if ( !(this.cwd === parent?.cwd) && this.isMonorepo ) {
      const children = this.getChildren({
        monorepoDepth: 1,
        workspaceDepth: Infinity,
      });

      const canUpgrade = (roserepo: Roserepo) => {
        return roserepo.packageJson !== undefined;
      };

      const filteredChildren = this.applyFilter(children, this.config?.monorepo?.upgrade?.include, this.config?.monorepo?.upgrade?.exclude).filter(canUpgrade);

      if ( this.isWorkspace && canUpgrade(this) ) {
        filteredChildren.unshift(this);
      }

      if ( filteredChildren.length === 0 ) {
        return logger.info("No workspaces to upgrade");
      }

      const { selectedRoserepos } = await inquirer.prompt<{ selectedRoserepos: Roserepo[] }>({
        type: "checkbox",
        name: "selectedRoserepos",
        prefix: logger.config.symbol,
        message: logger.format("Select to upgrade"),
        choices: filteredChildren.map((roserepo) => {
          return {
            value: roserepo,
            name: roserepo.name,
          };
        }),
      });

      logger.line();

      for ( const selectedRoserepo of selectedRoserepos ) {
        await selectedRoserepo.upgrade(options, this);
      }

      return;
    }

    if ( this.isWorkspace ) {
      const upgrader = new Upgrader(this);

      return upgrader.upgrade();
    }

    throw new RoserepoError("Cannot upgrade an empty roserepo");
  };

  //

  private loadParent = async () => {
    if ( this.parent ) {
      return;
    }

    if ( this.isRoot ) {
      return;
    }

    const root = findRoot(path.dirname(this.cwd));

    if ( !root ) {
      this.config = {
        ...this.config,
        root: true,
      };

      return;
    }

    this.parent = new Roserepo(root);

    this.parent.children = [this];

    return this.parent.init();
  };

  //

  private loadChildren = async () => {
    let dirs = findChildren(this.cwd, this.root.getWorkspaces() ?? []);

    if ( dirs.length === 0 ) {
      return;
    }

    if ( !this.children ) {
      this.children = [];
    }

    dirs = dirs.filter((dir) => {
      return !this.children?.find((child) => {
        return pathMatch(child.cwd, dir);
      });
    });

    for ( const dir of dirs ) {
      const child = new Roserepo(dir);
      child.parent = this;
      this.children.push(child);
    }

    return Promise.all(this.children.map((child) => {
      return child.init();
    }));
  };

  //

  private createLogger = () => {
    this.logger = new Logger({
      name: this.name,
      color: logger.uniqueColor,
      symbol: logger.uniqueSymbol,
    });
  };
}

const defineRoserepo = (config: Config) => {
  return config;
};

export type {
  Config,
  MonorepoConfig,
  BaseRunnerConfig,
  WorkspaceConfig,
  BaseExecutorConfig,
  BaseCacheConfig,
};

export {
  Logger,
  logger,
  defineRoserepo,
  BaseCache,
  Cache,
  defineMonorepo,
  BaseRunner,
  Runner,
  defineWorkspace,
  BaseExecutor,
  Executor,
};

export default Roserepo;