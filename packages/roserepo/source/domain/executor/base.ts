import {RunOptions} from "~/commands/run";

import {Workspace} from "~/domain/workspace";

import {BaseRunner} from "~/domain/runner";

import {BaseCache} from "~/domain/cache";

import {mergeEnv} from "~/utils/env";

interface SharedExecutorConfig {
  env?: Record<string, string | number | boolean>;
  cache?: false | BaseCache<unknown>;
}

type BaseExecutorConfig<ExecutorConfig> = SharedExecutorConfig & ExecutorConfig;

abstract class BaseExecutor<ExecutorConfig> {
  initialized = false;

  config: BaseExecutorConfig<ExecutorConfig>;

  parent?: BaseExecutor<unknown>;
  runner?: BaseRunner<unknown>;

  workspace: Workspace;

  script: string;
  runOptions: RunOptions;

  constructor(config: BaseExecutorConfig<ExecutorConfig>) {
    this.config = config;
  }

  //

  clone = () => {
    return new (this.constructor as new (config: BaseExecutorConfig<ExecutorConfig>) => BaseExecutor<ExecutorConfig>)(this.config);
  };

  //

  init(workspace: Workspace, script: string, runOptions: RunOptions, runner?: BaseRunner<unknown>) {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.config = {
      ...workspace.config?.executorConfig,
      ...this.config,
    };

    this.workspace = workspace;

    this.script = script;
    this.runOptions = runOptions;

    this.runner = runner;
  }

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

  getMergedEnv = async () => {
    return mergeEnv({
      roserepo: this.workspace.roserepo,
      runner: this.runner,
      workspace: this.workspace,
      executor: this,
    });
  };

  //

  getCache = () => {
    const caches: BaseCache<unknown>[] = [];

    if (this.config.cache) {
      caches.push(this.config.cache);
    }

    if (this.parent) {
      caches.push(...this.parent.getCache());
    } else {
      if (this.runner) {
        caches.push(...this.runner.getCache());
      }
    }

    return caches.map((cache) => cache.clone());
  };

  //

  abstract execute: () => any;
}

export type {
  BaseExecutorConfig,
};

export default BaseExecutor;
