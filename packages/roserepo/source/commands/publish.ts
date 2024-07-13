import {createCommand} from "commander";

import {logger} from "~/shared/logger";

import {getModule} from "./shared/utils";

const publish = createCommand("publish");

publish.description("Publish workspace to the registry");

publish.option("-t, --tag <tag>", "Publish with tag");

publish.option("-a, --access <access>", "Access level", "public");

publish.option("-dr, --dry-run", "Dry run");

interface PublishOptions {
  tag: string;
  access: "public" | "restricted";
  dryRun: boolean;
}

publish.action(async (options: PublishOptions) => {
  const timer = logger.timer();

  logger.info("Publishing ...").line();

  try {
    const module = await getModule();

    await module.init();

    await module.publisher(options);

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
