import BaseExecutor from "~workspace/executor/base";
import { useExeca } from "~workspace/executor/utils";

import RoserepoError from "~shared/error";

interface ScriptExecutorConfig {
  script: string;
}

class ScriptExecutor extends BaseExecutor<ScriptExecutorConfig> {
  get packageManager() {
    const roserepo = this.roserepo.findRoserepo((roserepo) => {
      return roserepo.config?.packageManager !== undefined;
    }, "parent");

    if ( roserepo ) {
      return roserepo.config?.packageManager as string;
    }

    return "npm";
  }

  execute = () => {
    if ( !this.config.script ) {
      throw new RoserepoError("No script provided");
    }

    this.roserepo.logger.info(`Running script ${ this.roserepo.logger.mark(this.config.script) }`);

    return useExeca({
      command: this.packageManager,
      args: [ "run", this.config.script ],
      roserepo: this.roserepo,
      runner: this.runner,
      executor: this,
    });
  };
}

export type {
  ScriptExecutorConfig,
};

export default ScriptExecutor;