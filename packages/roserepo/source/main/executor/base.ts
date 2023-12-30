import Roserepo from "~/main";

import {RunOptions} from "~bin/commands/run";

import BaseCache from "~main/cache/base";
import BaseRunner from "~main/runner/base";

import {deepMerge} from "~shared/utils";

import {logger} from "~shared/logger";

interface ExecutorConfig {
  env?: Record<string, string | number | boolean>;
  cache?: BaseCache<unknown>;
}

type Extends<Config> = (
  {
    extends: string | BaseExecutor<any>;
  } & (Partial<(Config & ExecutorConfig)>)
) | (
  {
    extends?: undefined | null;
  } & (Config & ExecutorConfig)
);

type Inherit<Config> = (
  {
    inherit: true;
  } & (Partial<(Config & ExecutorConfig)>)
) | (
  {
    inherit?: undefined | null;
  } & (Config & ExecutorConfig)
);

type BaseExecutorConfig<Config> = Extends<Config> & Inherit<Config>;

abstract class BaseExecutor<ExecutorConfig> {
  config: BaseExecutorConfig<ExecutorConfig>;

  prepared = false;

  roserepo: Roserepo;

  script: string;
  options: RunOptions;

  parentExecutor?: BaseExecutor<unknown>;

  runner?: BaseRunner<unknown>;

  constructor(config: BaseExecutorConfig<ExecutorConfig>) {
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
    if (this.config.inherit && this.parentExecutor) {
      return this.parentExecutor.config;
    }

    return {};
  };

  //

  environmentVariables() {
    let env: Record<string, string> = {};

    Object.entries(this.config?.env ?? {}).forEach(([key, value]) => {
      env[key] = value.toString();
    });

    env = {
      ...this.parentExecutor?.environmentVariables() ?? {},
      ...env,
    };

    return env;
  }

  //

  init = (script: string, options: RunOptions, runner?: BaseRunner<unknown>) => {
    this.prepared = true;

    this.script = script;
    this.options = options;

    this.runner = runner;

    this.config = deepMerge(this.getExtendedConfig(), this.getInheritedConfig(), this.config);
  };

  initFrom = (parentExecutor: BaseExecutor<unknown>) => {
    this.parentExecutor = parentExecutor;
    this.init(parentExecutor.script, parentExecutor.options, parentExecutor.runner);
  };

  abstract execute: () => Promise<void> | void;
}

export type {
  BaseExecutorConfig,
};

export default BaseExecutor;