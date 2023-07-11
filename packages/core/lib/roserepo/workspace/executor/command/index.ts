import BaseExecutor from "~workspace/executor/base";
import { useExeca } from "~workspace/executor/utils";

import RoserepoError from "~shared/error";

interface CommandExecutorConfig {
  command: string;
  args?: string[];
}

class CommandExecutor extends BaseExecutor<CommandExecutorConfig> {
  execute = () => {
    if ( !this.config.command ) {
      throw new RoserepoError("No command provided");
    }

    this.roserepo.logger.info(`Running command ${ this.roserepo.logger.mark(this.config.command) }`);

    return useExeca({
      command: this.config.command,
      args: this.config.args,
      roserepo: this.roserepo,
      runner: this.runner,
      executor: this,
    });
  };
}

export type {
  CommandExecutorConfig,
};

export default CommandExecutor;