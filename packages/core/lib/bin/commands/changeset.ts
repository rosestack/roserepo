import { createCommand } from "commander";

import Roserepo from "~/roserepo";

import RoserepoError from "~shared/error";

import { logger } from "~shared/logger";
import { findRoot } from "~shared/utils";

const changeset = createCommand("changeset");

changeset.description("Manage versioning and changelogs for workspaces");

changeset.option("-m, --message <message>", "Commit message");

interface ChangesetOptions {
  message?: string;
}

changeset.action(async (options: ChangesetOptions) => {
  logger.info("Changeset").line();

  try {
    const cwd = findRoot(process.cwd());

    if ( !cwd ) {
      throw new RoserepoError("Could not find roserepo");
    }

    const roserepo = new Roserepo(cwd);

    const initStart = logger.debug("Initializing roserepo").startTimer();
    await roserepo.init();
    logger.debug(`Initialized in ${ logger.endTimer(initStart) }ms`);

    const changesetStart = logger.startTimer();
    await roserepo.changeset(options);
    const end = logger.endTimer(changesetStart);

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
  ChangesetOptions,
};

export default changeset;