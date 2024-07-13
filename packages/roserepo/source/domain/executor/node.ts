import BaseExecutor from "./base";

import {Spawner} from "~/utils/spawner";

interface NodeExecutorConfig {
  file: string;
}

class NodeExecutor extends BaseExecutor<NodeExecutorConfig> {
  execute = async () => {
    this.workspace.logger.info(`Running script: ${this.workspace.logger.mark(this.config.file)}`);

    const spawner = new Spawner(this.workspace);

    await spawner.spawn({
      command: "node",
      args: [this.config.file],
      options: {
        env: await this.getMergedEnv(),
      },
    });
  };
}

export type {
  NodeExecutorConfig,
};

export default NodeExecutor;
