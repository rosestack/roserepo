import {RunOptions} from "~/commands/run";

import {Roserepo} from "~/domain/roserepo";

import {BaseExecutor} from "~/domain/executor";

import {BaseCache} from "~/domain/cache";

import {logger} from "~/shared/logger";

import {WorkspaceFilter, PriorityWorkspaceFilter, WorkspaceFilterConfig} from "~/utils/filter";

import Task from "./helper/task";

interface SharedRunnerConfig extends WorkspaceFilterConfig {
  env?: Record<string, string | number | boolean>;
  //
  executor?: BaseExecutor<unknown>;
  cache?: BaseCache<unknown>;
  //
  parallel?: boolean;
  restartOnError?: boolean;
  restartRetries?: number;
  throwOnError?: boolean;
}

type BaseRunnerConfig<RunnerConfig> = SharedRunnerConfig & RunnerConfig;

abstract class BaseRunner<RunnerConfig> {
  initialized = false;

  config: BaseRunnerConfig<RunnerConfig>;

  parent?: BaseRunner<unknown>;

  roserepo: Roserepo;

  script: string;
  runOptions: RunOptions;

  workspaceFilter: WorkspaceFilter;

  constructor(config: BaseRunnerConfig<RunnerConfig>) {
    this.config = config;
  }

  //

  clone = () => {
    return new (this.constructor as new (config: BaseRunnerConfig<RunnerConfig>) => BaseRunner<RunnerConfig>)(this.config);
  };

  //

  init = (roserepo: Roserepo, script: string, runOptions: RunOptions) => {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.config = {
      ...roserepo.config?.runnerConfig,
      ...this.config,
    };

    this.workspaceFilter = new WorkspaceFilter(this.config);

    this.roserepo = roserepo;

    this.script = script;
    this.runOptions = runOptions;
  };

  //

  getEnv = async () => {
    const env = {};

    if (this.parent) {
      Object.assign(env, await this.parent.getEnv());
    }

    const configEnv = this.config?.env ?? {};

    for (const key in configEnv) {
      env[key] = String(configEnv[key]);
    }

    return env;
  };

  //

  getCache = () => {
    const caches: BaseCache<unknown>[] = [];

    if (this.config.cache) {
      caches.push(this.config.cache);
    }

    if (this.parent) {
      caches.push(...this.parent.getCache());
    }

    return caches.map((cache) => cache.clone());
  };

  //

  filteredWorkspaces = () => {
    const filters: WorkspaceFilter[] = [];

    if (this.runOptions.for) {
      filters.push(new WorkspaceFilter({
        include: this.runOptions.for,
      }));
    }

    let runner: BaseRunner<unknown> | undefined = this;

    while (runner) {
      filters.push(runner.workspaceFilter);
      runner = runner.parent;
    }

    const priorityFilter = new PriorityWorkspaceFilter(
      ...filters,
      this.roserepo.workspaceFilter,
    );

    return this.roserepo.workspaces.filter(priorityFilter.match);
  };

  //

  runTask = async (task: Task, retries = 0) => {
    try {
      await task.workspace.runner(task.script, task.runOptions, task.runner);
    } catch (error) {
      task.workspace.logger.error(error);

      if (this.config.restartOnError) {
        if (retries >= this.config.restartRetries) {
          task.workspace.logger.error(`Failed to restart ${logger.mark(task.script)} after ${retries} retries.`);
          return;
        }

        task.workspace.logger.info(`Restarting ${logger.mark(task.script)}...`);

        await this.runTask(task, retries + 1);
      } else if (this.config.throwOnError) {
        throw new Error(`Script ${logger.mark(task.script)} failed.`, {
          cause: error,
        });
      }
    }
  };

  runTasks = async (tasks: Task[]) => {
    const taskTables = tasks.reduce<Task[][]>((taskTables, task) => {
      if (taskTables.length === 0) {
        taskTables.push([task]);
        return taskTables;
      }

      const lastTasks = taskTables[taskTables.length - 1]!;
      const lastTask = lastTasks[lastTasks.length - 1]!;

      if (task.runner.config.parallel && lastTask.runner.config.parallel) {
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

  abstract run: () => any;
}

export type {
  BaseRunnerConfig,
};

export default BaseRunner;
