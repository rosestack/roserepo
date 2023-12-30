import {createCommand} from "commander";

import Roserepo from "~/main";

import {logger} from "~shared/logger";

const publish = createCommand("publish");

publish.description("Publish package to registry");

publish.option("--registry <registry>", "Publish to a custom registry");

publish.option("--dry", "Dry run");

interface PublishOptions {
  registry?: string;
  dry?: boolean;
}

publish.action(async (options: PublishOptions) => {
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
    await roserepo.publish(options);

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export type {
  PublishOptions,
};

export default publish;