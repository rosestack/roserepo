import {createCommand} from "commander";

import Roserepo from "~/main";

import {logger} from "~shared/logger";

const upgrade = createCommand("upgrade");

upgrade.description("upgrade package");

interface UpgradeOptions {
}

upgrade.action(async (options: UpgradeOptions) => {
  const timer = logger.timer();

  logger.info("Upgrade").line();

  const cwd = await Roserepo.cwd();

  if (!cwd) {
    logger.error("Could not find working directory");
    return;
  }

  const roserepo = new Roserepo(cwd);

  roserepo.first = true;

  try {
    await roserepo.init();
    await roserepo.upgrade(options);

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export type {
  UpgradeOptions,
};

export default upgrade;