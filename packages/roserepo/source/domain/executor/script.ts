import BaseExecutor from "./base";

import {Spawner} from "~/utils/spawner";

interface ScriptExecutorConfig {
  script?: string;
}

class ScriptExecutor extends BaseExecutor<ScriptExecutorConfig> {
  execute = async () => {
    const script = this.config.script ?? this.script;

    this.workspace.logger.info(`Running script: ${this.workspace.logger.mark(script)}`);

    const spawner = new Spawner(this.workspace);

    const {command, args} = this.workspace.packageManager.run(script);

    await spawner.spawn({
      command,
      args,
      options: {
        env: await this.getMergedEnv(),
      },
    });
  };
}

export type {
  ScriptExecutorConfig,
};

export default ScriptExecutor;
