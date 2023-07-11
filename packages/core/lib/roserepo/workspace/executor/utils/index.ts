import { execa } from "execa";

import type Roserepo from "~/roserepo";
import type BaseRunner from "~monorepo/runner/base";
import type BaseExecutor from "~workspace/executor/base";

interface ExecaOptions {
  command: string;
  args?: string[];
  roserepo: Roserepo;
  runner?: BaseRunner<unknown>;
  executor: BaseExecutor<unknown>;
}

const useExeca = (options: ExecaOptions) => new Promise<void>((resolve, reject) => {
  const { command, args, roserepo, runner, executor } = options;

  const childProcess = execa(command, args, {
    cwd: roserepo.cwd,
    env: {
      "FORCE_COLOR": "3",
      ...roserepo.environmentVariables,
      ...runner?.environmentVariables ?? {},
      ...executor.environmentVariables ?? {},
    } as any,
    extendEnv: true,
    stdio: [
      "inherit",
      "pipe",
      "pipe",
    ],
  });

  childProcess.stdout?.on("data", (data) => {
    const messages = data.toString().trim().split("\n");

    for ( const message of messages ) {
      roserepo.logger.logout(message);
    }
  });
  childProcess.stderr?.on("data", (data) => {
    const messages = data.toString().trim().split("\n");

    for ( const message of messages ) {
      roserepo.logger.logerr(message);
    }
  });

  childProcess.once("error", (error) => {
    return reject(error);
  });
  childProcess.once("exit", (code) => {
    if ( code === 0 ) {
      roserepo.logger.info(`Exited with code ${code}`);
      return resolve();
    }

    return reject("Exited with non-zero exit code");
  });
});

export {
  useExeca,
};