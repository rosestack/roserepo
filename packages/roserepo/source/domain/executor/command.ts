import BaseExecutor from "./base";

import {Spawner} from "~/utils/spawner";

interface CommandExecutorConfig {
  command: string;
  args?: string[];
}

class CommandExecutor extends BaseExecutor<CommandExecutorConfig> {
  execute = async () => {
    this.workspace.logger.info(`Running command ${this.workspace.logger.mark(this.config.command)}`);

    const spawner = new Spawner(this.workspace);

    await spawner.spawn({
      command: this.config.command,
      args: this.config.args,
      options: {
        env: await this.getMergedEnv(),
      },
    });
  };
}

export type {
  CommandExecutorConfig,
};

export default CommandExecutor;
