import {createCommand} from "commander";

import {logger} from "~/shared/logger";

import {getModule} from "./shared/utils";

const run = createCommand("run");

run.description("Run script in the monorepo");

run.argument("<script>", "Script to run in the monorepo");

run.option("--no-cache", "Disable caching");

run.option("-f --for <packages...>", "Run script only for specified packages");

interface RunOptions {
  cache?: boolean;
  for?: string[];
}

run.action(async (script: string, options: RunOptions) => {
  const timer = logger.timer();

  logger.info("Running script", logger.mark(script)).line();

  try {
    const module = await getModule();

    await module.init();

    await module.runner(script, options);

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
