import {createCommand} from "commander";

import Roserepo from "~/main";

import {logger} from "~shared/logger";

const version = createCommand("version");

version.description("Version package");

interface VersionOptions {
}

version.action(async (options: VersionOptions) => {
  const timer = logger.timer();

  logger.info("Publish").line();

  const cwd = await Roserepo.cwd();

  if (!cwd) {
    logger.error("Could not find working directory");
    return;
  }

  const roserepo = new Roserepo(cwd);

  roserepo.first = true;

  try {
    await roserepo.init();
    await roserepo.version(options);

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export type {
  VersionOptions,
};

export default version;