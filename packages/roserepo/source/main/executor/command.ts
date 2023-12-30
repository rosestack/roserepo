import {execa} from "execa";

import BaseExecutor from "./base";

interface CommandExecutorConfig {
  command: string;
  args?: string[];
}

class CommandExecutor extends BaseExecutor<CommandExecutorConfig> {
  execute = () => new Promise<void>((resolve, reject) => {
    if (!this.config.command) {
      return reject("No file specified");
    }

    this.roserepo.logger.info(`Running command ${this.roserepo.logger.mark(this.config.command)}`);

    const childProcess = execa(this.config.command, this.config.args, {
      cwd: this.roserepo.cwd,
      env: Object.assign({"FORCE_COLOR": "3"}, {
        ...this.roserepo.environmentVariables(),
        ...this.runner?.environmentVariables() ?? {},
        ...this.environmentVariables(),
      }),
      extendEnv: true,
      stdio: [
        "inherit",
        "pipe",
        "pipe",
      ],
    });

    childProcess.stdout?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logout(message);
      }
    });
    childProcess.stderr?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logerr(message);
      }
    });

    childProcess.once("error", (error) => {
      return reject(error);
    });
    childProcess.once("exit", (code) => {
      if (code === 0) {
        this.roserepo.logger.info(`Exited with code ${this.roserepo.logger.mark(code)}`);
        return resolve();
      }

      return reject(`Exited with code ${this.roserepo.logger.mark(code)} `);
    });
  });
}

export type {
  CommandExecutorConfig,
};

export default CommandExecutor;