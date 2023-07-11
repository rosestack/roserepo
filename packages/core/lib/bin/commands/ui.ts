import { createCommand } from "commander";

import Roserepo from "~/roserepo";

import RoserepoError from "~shared/error";

import { findRoot } from "~shared/utils";

import { logger } from "~shared/logger";

const ui = createCommand("ui");

ui.description("Launch the UI");

ui.action(async () => {
  logger.info("Launching UI");

  try {
    const Ui = await import( "@roserepo/ui" ).then((m) => {
      return m.default;
    }).catch(() => {
      throw new RoserepoError("Failed to load UI module, is it installed?");
    });

    const cwd = findRoot(process.cwd());

    if ( !cwd ) {
      throw new RoserepoError("Could not find roserepo");
    }

    const roserepo = new Roserepo(cwd);

    let timer = logger.debug("Initializing roserepo").startTimer();
    await roserepo.init();
    logger.debug(`Initialized in ${ logger.endTimer(timer) }ms`);

    const ui = new Ui(roserepo);

    timer = logger.debug("Initializing roserepo").startTimer();
    await ui.init();
    logger.debug(`Initialized in ${ logger.endTimer(timer) }ms`);

    return ui.start();
  } catch ( error: unknown ) {
    return logger.error(RoserepoError.from(error), {
      lineBefore: true,
      stack: true,
      exit: true,
    });
  }
});

export default ui;