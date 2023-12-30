import {execa} from "execa";

import BaseExecutor from "./base";

interface ScriptExecutorConfig {
  script?: string;
}

class ScriptExecutor extends BaseExecutor<ScriptExecutorConfig> {
  get packageManager() {
    return this.roserepo.resolveConfig("parent", (config) => {
      return config?.packageManager !== undefined;
    })?.packageManager ?? "npm";
  }

  execute = () => new Promise<void>((resolve, reject) => {
    const script = this.config.script ?? this.script;

    this.roserepo.logger.info(`Running script ${this.roserepo.logger.mark(script)}`);

    const childProcess = execa(this.packageManager, ["run", script], {
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
  ScriptExecutorConfig,
};

export default ScriptExecutor;