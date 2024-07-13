import {execa, Options, ResultPromise} from "execa";

import {Workspace} from "~/domain/workspace";

interface SpawnConfig {
  command: string;
  args?: string[];
  options?: Options;
}

class Spawner {
  workspace: Workspace;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
  }

  spawn = (config: SpawnConfig) => {
    const {command, args, options} = config;

    return new Promise<void>((resolve, reject) => {
      const process = execa(command, args, {
        cwd: this.workspace.cwd,
        extendEnv: true,
        stdio: [
          "inherit", // stdin
          "pipe", // stdout
          "pipe", // stderr
        ],
        ...options,
        env: {
          ...options?.env,
          FORCE_COLOR: "true",
        },
      });

      process.stdout.setEncoding("utf8");
      process.stderr.setEncoding("utf8");

      process.stdout.on("data", (data) => {
        const messages = data.toString().trim().split("\n");

        for (const message of messages) {
          this.workspace.logger.logout(message);
        }
      });
      process.stderr.on("data", (data) => {
        const messages = data.toString().trim().split("\n");

        for (const message of messages) {
          this.workspace.logger.logerr(message);
        }
      });

      process.once("error", (error) => {
        return reject(error);
      });
      process.on("exit", (code) => {
        if (code === 0) {
          this.workspace.logger.info(`Exited with code ${this.workspace.logger.mark(code)}`);
          return resolve();
        }

        return reject(`Exited with code ${this.workspace.logger.mark(code)} `);
      });
    });
  };

  result = (config: SpawnConfig): ResultPromise => {
    const {command, args, options} = config;

    return execa(command, args, {
      cwd: this.workspace.cwd,
      extendEnv: true,
      reject: false,
      stdio: "inherit",
      ...options,
      env: {
        ...options?.env,
        FORCE_COLOR: "true",
      },
    });
  };
}

export type {
  SpawnConfig,
};

export {
  Spawner,
};
