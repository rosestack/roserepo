import {createCommand} from "commander";

import {logger} from "~shared/logger";

import Roserepo from "~/main";

const run = createCommand("run");

run.description("Run script in the monorepo");

run.argument("<script>", "Script to run in the monorepo");

run.option("--dry", "Dry run");

run.option("--no-cache", "Disable caching");

interface RunOptions {
  cache?: boolean;
  dry?: boolean;
}

run.action(async (script: string, options: RunOptions) => {
  const timer = logger.timer();

  logger.info("Running script", logger.mark(script)).line();

  const cwd = await Roserepo.cwd();

  if (!cwd) {
    logger.error("Could not find working directory");
    return;
  }

  const roserepo = new Roserepo(cwd);

  roserepo.first = true;

  try {
    await roserepo.init();
    await roserepo.run(script, options);

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export type {
  RunOptions,
};

export default run;