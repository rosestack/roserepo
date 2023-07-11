import { createCommand } from "commander";

import Roserepo from "~/roserepo";

import RoserepoError from "~shared/error";

import { logger } from "~shared/logger";
import { findRoot } from "~shared/utils";

const upgrade = createCommand("upgrade");

upgrade.description("Upgrade workspaces dependencies");

upgrade.option("-a, --all", "Upgrade all workspaces dependencies");

interface UpgradeOptions {
  all?: boolean;
}

upgrade.action(async (options: UpgradeOptions) => {
  logger.info("Upgrading workspaces dependencies").line();

  try {
    const cwd = findRoot(process.cwd());

    if ( !cwd ) {
      throw new RoserepoError("Could not find roserepo");
    }

    const roserepo = new Roserepo(cwd);

    const initStart = logger.debug("Initializing roserepo").startTimer();
    await roserepo.init();
    logger.debug(`Initialized in ${ logger.endTimer(initStart) }ms`);

    const upgradeStart = logger.startTimer();
    await roserepo.upgrade(options);
    const end = logger.endTimer(upgradeStart);

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
  UpgradeOptions,
};

export default upgrade;