import type Roserepo from "~/roserepo";

import type { RunOptions } from "~bin/commands/run";

import BaseCache from "~roserepo/common/cache/base";

import RoserepoError from "~shared/error";

import { logger } from "~shared/logger";
import { deepMerge } from "~shared/utils";

import type { RoserepoFilter } from "~/types";

interface Task {
  roserepo: Roserepo;
  script: string;
  options: RunOptions;
  runner?: BaseRunner<any>;
}

interface Config {
  env?: {
    [variable: string]: string | number | boolean;
  };
  runSelf?: boolean;
  parallel?: boolean;
  restartOnError?: boolean;
  throwOnError?: boolean;
  //
  cache?: BaseCache<unknown> | "inherit";
  //
  include?: string | RegExp | RoserepoFilter[];
  exclude?: string | RegExp | RoserepoFilter[];
}

type Extends<RunnerConfig> = (
  {
    extends: string | BaseRunner<any>;
  } & (Partial<(RunnerConfig & Config)>)
) | (
  {
    extends?: undefined | null;
  } & (RunnerConfig & Config)
);

type Inherit<RunnerConfig> = (
  {
    inherit: true;
  } & (Partial<(RunnerConfig & Config)>)
) | (
  {
    inherit?: undefined | null;
  } & (RunnerConfig & Config)
);

type BaseRunnerConfig<RunnerConfig> = Extends<RunnerConfig> & Inherit<RunnerConfig>;

abstract class BaseRunner<RunnerConfig> {
  prepared = false;

  script: string;
  options: RunOptions;

  roserepo: Roserepo;
  roserepos: Roserepo[];

  rootRunner?: BaseRunner<unknown>;
  parentRunner?: BaseRunner<unknown>;

  config: BaseRunnerConfig<RunnerConfig>;

  get logger() {
    if ( this.rootRunner ) {
      return this.roserepo.logger;
    }

    return logger;
  }

  get environmentVariables(): Record<string, string> {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([ key, value ]) => {
      env[key] = value.toString();
    });

    if ( this.rootRunner ) {
      env = {
        ...this.rootRunner.environmentVariables,
        ...env,
      };
    }

    if ( this.parentRunner ) {
      env = {
        ...this.parentRunner.environmentVariables,
        ...env,
      };
    }

    return env;
  }

  constructor(config: BaseRunnerConfig<RunnerConfig>) {
    this.config = config;
  }

  protected applyFilter = (roserepos: Roserepo[]): Roserepo[] => {
    let priorityInclude: RoserepoFilter[] = [];
    let priorityExclude: RoserepoFilter[] = [];

    if ( this.config?.include ) {
      if ( Array.isArray(this.config.include) ) {
        priorityInclude = this.config.include.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        priorityInclude.push({
          type: "all",
          match: "name",
          pattern: this.config.include,
        });
      }
    }

    if ( this.config?.exclude ) {
      if ( Array.isArray(this.config.exclude) ) {
        priorityExclude = this.config.exclude.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        priorityExclude.push({
          type: "all",
          match: "name",
          pattern: this.config.exclude,
        });
      }
    }

    let include: RoserepoFilter[] = [];
    let exclude: RoserepoFilter[] = [];

    if ( this.roserepo.config?.monorepo?.include ) {
      if ( Array.isArray(this.roserepo.config.monorepo.include) ) {
        include = this.roserepo.config.monorepo.include.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        include.push({
          type: "all",
          match: "name",
          pattern: this.roserepo.config.monorepo.include,
        });
      }
    }

    if ( this.roserepo.config?.monorepo?.exclude ) {
      if ( Array.isArray(this.roserepo.config.monorepo.exclude) ) {
        exclude = this.roserepo.config.monorepo.exclude.map((filter) => {
          filter.match ??= "name";

          return filter;
        });
      } else {
        exclude.push({
          type: "all",
          match: "name",
          pattern: this.roserepo.config.monorepo.exclude,
        });
      }
    }

    return roserepos.filter((roserepo) => {
      if ( priorityInclude.length ) {
        return priorityInclude.some((filter) => {
          return roserepo.match(filter);
        });
      }

      if ( priorityExclude.length ) {
        return !priorityExclude.some((filter) => {
          return roserepo.match(filter);
        });
      }

      if ( include.length ) {
        return include.some((filter) => {
          return roserepo.match(filter);
        });
      }

      if ( exclude.length ) {
        return !exclude.some((filter) => {
          return roserepo.match(filter);
        });
      }

      return true;
    });
  };

  //

  private getExtendedConfig = () => {
    if ( (this.config.extends) ) {
      if ( typeof this.config.extends === "string" ) {
        const extendedRunner = this.roserepo.getRunner(this.config.extends);

        if ( !extendedRunner ) {
          throw new RoserepoError(`Runner ${ logger.mark(this.config.extends) } not found.`);
        }

        if ( !extendedRunner.prepared ) {
          extendedRunner.init(this.config.extends, this.options);
        }

        return extendedRunner.config;
      }

      return this.config.extends.config;
    }

    return {};
  };

  private getInheritedConfig = (): any => {
    if ( this.config.inherit ) {
      if ( this.parentRunner ) {
        return this.parentRunner.config;
      }

      const nearestMonorepo = this.roserepo.nearestMonorepo;

      if ( !nearestMonorepo ) {
        throw new RoserepoError("Cannot inherit config: no parent monorepo found.");
      }

      const parentRunner = nearestMonorepo.getRunner(this.script);

      if ( !parentRunner ) {
        throw new RoserepoError(`Runner ${ logger.mark(this.script) } not found.`);
      }

      parentRunner.init(this.script, this.options);

      return parentRunner.config;
    }

    return {};
  };

  getCache = (inherit = false): (BaseCache<unknown> | undefined) => {
    const cache = this.config.cache;

    if ( !cache ) {
      return;
    }

    if ( cache instanceof BaseCache ) {
      return cache;
    }

    if ( inherit || cache === "inherit" ) {
      if ( this.parentRunner ) {
        return this.parentRunner.getCache(true);
      }

      const nearestMonorepo = this.roserepo.nearestMonorepo;

      if ( !nearestMonorepo ) {
        throw new RoserepoError("Cannot inherit cache: no parent monorepo found.");
      }

      const parentRunner = nearestMonorepo.getRunner(this.script);

      if ( !parentRunner ) {
        if ( nearestMonorepo.isRoot ) {
          throw new RoserepoError(`Cannot inherit cache: runner ${ logger.mark(this.script) } not found.`);
        }
      }

      if ( !parentRunner?.prepared ) {
        parentRunner?.init(this.script, this.options);
      }

      return parentRunner?.getCache(true);
    }

    return;
  };

  init = (script: string, options: RunOptions): void => {
    this.prepared = true;

    this.script = script;
    this.options = options;

    this.config = deepMerge(this.getExtendedConfig(), this.getInheritedConfig(), this.config);
  };

  fromParent = (runner: BaseRunner<unknown>): void => {
    this.parentRunner = runner;
    this.rootRunner = runner.rootRunner;

    this.roserepo = runner.roserepo;
    this.roserepos = runner.roserepos;

    this.init(runner.script, runner.options);
  };

  //

  createTask = (roserepo: Roserepo, script: string, options: RunOptions, runner?: BaseRunner<any>): Task => {
    runner ??= this;

    return {
      roserepo,
      script,
      options,
      runner,
    };
  };

  createTasks = (roserepos: Roserepo[], script: string, options: RunOptions, runner?: BaseRunner<any>): Task[] => {
    return roserepos.map((roserepo) => {
      return this.createTask(roserepo, script, options, runner);
    });
  };

  runTask = async (task: Task) => {
    try {
      await task.roserepo.run(task.script, task.options, task.runner);
    } catch ( error ) {
      task.roserepo.logger.error(error);

      if ( this.config.restartOnError ) {
        task.roserepo.logger.info(`Restarting ${ logger.mark(task.script) }...`);

        await this.runTask(task);
      } else if ( this.config.throwOnError ) {
        throw new RoserepoError(`Script ${ logger.mark(task.script) } failed.`, {
          cause: error,
        });
      }
    }
  };

  runTasks = async (tasks: Task[]) => {
    const taskTables = tasks.reduce<Task[][]>((taskTables, task) => {
      if ( taskTables.length === 0 ) {
        taskTables.push([task]);

        return taskTables;
      }

      const lastTasks = taskTables[taskTables.length - 1]!;
      const lastTask = lastTasks[lastTasks.length - 1]!;

      if ( task.runner?.config.parallel && lastTask.runner?.config.parallel ) {
        lastTasks.push(task);
      } else {
        taskTables.push([task]);
      }

      return taskTables;
    }, []);

    for ( const taskTable of taskTables ) {
      await Promise.all(taskTable.map(this.runTask));
    }
  };

  //

  abstract run(): (Promise<any> | any);
}

export type {
  BaseRunnerConfig,
};

export default BaseRunner;