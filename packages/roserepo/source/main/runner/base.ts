import Roserepo from "~/main";

import {RunOptions} from "~bin/commands/run";

import BaseCache from "~main/cache/base";

import type {Filter} from "~shared/types";

import {deepMerge} from "~shared/utils";

import {logger} from "~shared/logger";

interface Task {
  roserepo: Roserepo;
  script: string;
  options: RunOptions;
  runner?: BaseRunner<unknown>;
}

interface RunnerConfig {
  env?: Record<string, string | number | boolean>;
  cache?: BaseCache<unknown>;
  //
  include?: Filter;
  exclude?: Filter;
  //
  parallel?: boolean;
  restartOnError?: boolean;
  throwOnError?: boolean;
}

type Extends<Config> = (
  {
    extends: string | BaseRunner<any>;
  } & (Partial<(Config & RunnerConfig)>)
) | (
  {
    extends?: undefined | null;
  } & (Config & RunnerConfig)
);

type Inherit<Config> = (
  {
    inherit: true;
  } & (Partial<(Config & RunnerConfig)>)
) | (
  {
    inherit?: undefined | null;
  } & (Config & RunnerConfig)
);

type BaseRunnerConfig<Config> = Extends<Config> & Inherit<Config>;

abstract class BaseRunner<RunnerConfig> {
  config: BaseRunnerConfig<RunnerConfig>;

  prepared = false;

  roserepo: Roserepo;
  roserepos: Roserepo[];

  script: string;
  options: RunOptions;

  rootRunner?: BaseRunner<unknown>;
  parentRunner?: BaseRunner<unknown>;

  constructor(config: BaseRunnerConfig<RunnerConfig>) {
    this.config = config;
  }

  private getExtendedConfig = () => {
    if ((this.config.extends)) {
      if (typeof this.config.extends === "string") {
        const extendedRunner = this.roserepo.getRunner(this.config.extends);

        if (!extendedRunner) {
          throw new Error(`Runner ${logger.mark(this.config.extends)} not found.`);
        }

        if (!extendedRunner.prepared) {
          extendedRunner.init(this.config.extends, this.options);
        }

        return extendedRunner.config;
      }

      return this.config.extends.config;
    }

    return {};
  };

  private getInheritedConfig = () => {
    if (!this.config.inherit) {
      return {};
    }

    if (this.parentRunner) {
      return this.parentRunner.config;
    }

    if (this.rootRunner) {
      return this.rootRunner.config;
    }

    return {};
  };

  //

  protected filter = (): Filter[][] => {
    const filter: Filter[][] = [];

    let include = this.config.include ?? [] as any;
    let exclude = this.config.exclude ?? [] as any;

    if (!Array.isArray(include)) {
      include = [include];
    }

    if (!Array.isArray(exclude)) {
      exclude = [exclude];
    }

    if (include.length !== 0 || exclude.length !== 0) {
      filter.push([include, exclude]);
    }

    if (this.parentRunner) {
      filter.push(...this.parentRunner.filter());
    }

    if (this.rootRunner) {
      filter.push(...this.rootRunner.filter());
    }

    return filter;
  };

  protected applyFilter = (roserepos: Roserepo[]): Roserepo[] => {
    const runnerFilter = this.filter();

    const filter = this.roserepo.reduceParentConfig<Filter[][]>((filter, roserepo) => {
      let include = roserepo.config?.include ?? [] as any;
      let exclude = roserepo.config?.exclude ?? [] as any;

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

    return this.roserepo.filterPriority(roserepos, runnerFilter.concat(filter));
  };

  //

  protected createTask = (roserepo: Roserepo, script: string, options: RunOptions, runner?: BaseRunner<any>): Task => {
    runner ??= this;

    return {
      roserepo,
      script,
      options,
      runner,
    };
  };

  protected createTasks = (roserepos: Roserepo[], script: string, options: RunOptions, runner?: BaseRunner<any>): Task[] => {
    return roserepos.map((roserepo) => {
      return this.createTask(roserepo, script, options, runner);
    });
  };

  //

  protected runTask = async (task: Task) => {
    try {
      await task.roserepo.run(task.script, task.options, task.runner);
    } catch (error) {
      task.roserepo.logger.error(error);

      if (this.config.restartOnError) {
        task.roserepo.logger.info(`Restarting ${logger.mark(task.script)}...`);

        await this.runTask(task);
      } else if (this.config.throwOnError) {
        throw new Error(`Script ${logger.mark(task.script)} failed.`, {
          cause: error,
        });
      }
    }
  };

  protected runTasks = async (tasks: Task[]) => {
    const taskTables = tasks.reduce<Task[][]>((taskTables, task) => {
      if (taskTables.length === 0) {
        taskTables.push([task]);

        return taskTables;
      }

      const lastTasks = taskTables[taskTables.length - 1]!;
      const lastTask = lastTasks[lastTasks.length - 1]!;

      if (task.runner?.config.parallel && lastTask.runner?.config.parallel) {
        lastTasks.push(task);
      } else {
        taskTables.push([task]);
      }

      return taskTables;
    }, []);

    for (const taskTable of taskTables) {
      await Promise.all(taskTable.map(this.runTask));
    }
  };

  //

  environmentVariables() {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([key, value]) => {
      env[key] = value.toString();
    });

    env = {
      ...this.parentRunner?.environmentVariables() ?? {},
      ...this.rootRunner?.environmentVariables() ?? {},
      ...env,
    };

    return env;
  }

  //

  init = (script: string, options: RunOptions) => {
    this.prepared = true;

    this.script = script;
    this.options = options;

    this.config = deepMerge(this.getExtendedConfig(), this.getInheritedConfig(), this.config);
  };

  initFrom = (runner: BaseRunner<unknown>) => {
    this.parentRunner = runner;
    this.init(runner.script, runner.options);
  };

  abstract run: () => any;
}

export type {
  BaseRunnerConfig,
};

export default BaseRunner;