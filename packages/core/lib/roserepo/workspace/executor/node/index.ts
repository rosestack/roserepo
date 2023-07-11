import BaseExecutor from "~workspace/executor/base";
import { useExeca } from "~workspace/executor/utils";

import RoserepoError from "~shared/error";

interface NodeExecutorConfig {
  file: string;
}

class NodeExecutor extends BaseExecutor<NodeExecutorConfig> {
  execute = () => {
    if ( !this.config.file ) {
      throw new RoserepoError("No file provided");
    }

    this.roserepo.logger.info(`Running node ${ this.roserepo.logger.mark(this.config.file) }`);

    return useExeca({
      command: "node",
      args: [this.config.file],
      roserepo: this.roserepo,
      runner: this.runner,
      executor: this,
    });
  };
}

export type {
  NodeExecutorConfig,
};

export default NodeExecutor;