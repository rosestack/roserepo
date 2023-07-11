import { createCommand } from "commander";

import Roserepo from "~/roserepo";

import RoserepoError from "~shared/error";

import { logger } from "~shared/logger";
import { findRoot } from "~shared/utils";

const run = createCommand("run");

run.description("Run script in the monorepo");

run.argument("<script>", "Script to run in the monorepo");

run.option("--scope [scope...]", "Scope to run the script in");

run.option("--no-cache", "Disable caching");

interface RunOptions {
  scope?: string[];
  cache?: boolean;
}

run.action(async (script: string, options: RunOptions) => {
  logger.info(`Running ${ logger.mark(script) }`).line();

  try {
    const cwd = findRoot(process.cwd());

    if ( !cwd ) {
      throw new RoserepoError("Could not find roserepo");
    }

    const roserepo = new Roserepo(cwd);

    const initStart = logger.debug("Initializing roserepo").startTimer();
    await roserepo.init();
    logger.debug(`Initialized in ${ logger.endTimer(initStart) }ms`);

    const runStart = logger.startTimer();
    await roserepo.run(script, options);
    const end = logger.endTimer(runStart);

    logger.line().info(`Completed in ${ logger.mark(`${ end }ms`) }`);
  } catch ( error: unknown ) {
    return logger.error(RoserepoError.from(error), {
      lineBefore: true,
      stack: true,
      exit: true,
    });
  }
});

export type {
  RunOptions,
};

export default run;