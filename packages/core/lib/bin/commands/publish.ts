import { createCommand } from "commander";

import Roserepo from "~/roserepo";

import RoserepoError from "~shared/error";

import { logger } from "~shared/logger";
import { findRoot } from "~shared/utils";

const publish = createCommand("publish");

publish.description("Publish workspaces to registry");

interface PublishOptions {
  registry?: string;
}

publish.action(async (options: PublishOptions) => {
  logger.info("Publish").line().line();

  try {
    const cwd = findRoot(process.cwd());

    if ( !cwd ) {
      throw new RoserepoError("Could not find roserepo");
    }

    const roserepo = new Roserepo(cwd);

    const initStart = logger.debug("Initializing roserepo").startTimer();
    await roserepo.init();
    logger.debug(`Initialized in ${ logger.endTimer(initStart) }ms`);

    const publishStart = logger.startTimer();
    await roserepo.publish(options);
    const end = logger.endTimer(publishStart);

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
  PublishOptions,
};

export default publish;