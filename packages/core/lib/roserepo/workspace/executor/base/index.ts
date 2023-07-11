import type { RunOptions } from "~bin/commands/run";

import type Roserepo from "~/roserepo";
import type BaseRunner from "~monorepo/runner/base";

import type BaseCache from "~roserepo/common/cache/base";

import RoserepoError from "~shared/error";

import { deepMerge } from "~shared/utils";
import { logger } from "~shared/logger";

interface Config {
  env?: {
    [variable: string]: string | number | boolean;
  };
  cache?: BaseCache<unknown>;
}

type BaseExecutorConfig<ExecutorConfig> = (
  {
    extends: string | BaseExecutor<any>;
  } & (Partial<(ExecutorConfig & Config)>)
) | (
  {
    extends?: undefined | null;
  } & (ExecutorConfig & Config)
);

abstract class BaseExecutor<ExecutorConfig> {
  prepared = false;

  config: BaseExecutorConfig<ExecutorConfig>;

  roserepo: Roserepo;

  script: string;
  options: RunOptions;

  parentExecutor?: BaseExecutor<any>;

  runner?: BaseRunner<unknown>;

  get environmentVariables(): Record<string, string> {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([ key, value ]) => {
      env[key] = value.toString();
    });

    if ( this.parentExecutor ) {
      env = {
        ...this.parentExecutor.environmentVariables,
        ...env,
      };
    }

    return env;
  }

  constructor(config: BaseExecutorConfig<ExecutorConfig>) {
    this.config = config;
  }

  private getExtendedConfig = () => {
    if ( this.config.extends ) {
      if ( typeof this.config.extends === "string" ) {
        const extendedExecutor = this.roserepo.getExecutor(this.config.extends);

        if ( !extendedExecutor ) {
          throw new RoserepoError(`Executor ${ logger.mark(this.config.extends) } not found.`);
        }

        if ( !extendedExecutor.prepared ) {
          extendedExecutor.init(this.config.extends, this.options);
        }

        return extendedExecutor.config;
      }

      return this.config.extends.config;
    }

    return {};
  };

  getCache = () => {
    return this.config.cache;
  };

  init = (script: string, options: RunOptions, runner?: BaseRunner<unknown>) => {
    this.prepared = true;

    this.script = script;
    this.options = options;

    this.runner = runner;

    this.config = deepMerge(this.getExtendedConfig(), this.config);
  };

  prepareFrom = (executor: BaseExecutor<any>) => {
    this.parentExecutor = executor;
    this.roserepo = executor.roserepo;
    this.init(executor.script, executor.options, executor.runner);
  };

  abstract execute(): (Promise<any> | any);
}

export type {
  BaseExecutorConfig,
};

export default BaseExecutor;