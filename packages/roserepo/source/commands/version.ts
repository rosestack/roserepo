import {createCommand} from "commander";

import {logger} from "~/shared/logger";

import {getModule} from "./shared/utils";

const version = createCommand("version");

version.description("Update the version of the module");

interface VersionOptions {
}

version.action(async (options: VersionOptions) => {
  const timer = logger.timer();

  logger.info("Versioning module...").line();

  try {
    const module = await getModule();

    await module.init();

    await module.versioner(options);

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
