import {Roserepo} from "~/domain/roserepo";
import {Workspace} from "~/domain/workspace";
import {BaseRunner} from "~/domain/runner";
import {BaseExecutor} from "~/domain/executor";

interface MergeEnvOptions {
  roserepo?: Roserepo;
  runner?: BaseRunner<unknown>;
  workspace?: Workspace;
  executor?: BaseExecutor<unknown>;
}

const mergeEnv = async (options: MergeEnvOptions) => {
  const env = {};

  if (options.roserepo) {
    const roserepo = await options.roserepo.getEnv();
    Object.assign(env, roserepo);
  }

  if (options.runner) {
    const runner = await options.runner.getEnv();
    Object.assign(env, runner);
  }

  if (options.workspace) {
    const workspace = await options.workspace.getEnv();
    Object.assign(env, workspace);
  }

  if (options.executor) {
    const executor = await options.executor.getEnv();
    Object.assign(env, executor);
  }

  return env;
};

export type {
  MergeEnvOptions,
};

export {
  mergeEnv,
};
