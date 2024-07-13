import {createCommand} from "commander";

import {logger} from "~/shared/logger";

import {getModule} from "./shared/utils";

const upgrade = createCommand("upgrade");

upgrade.description("Upgrade workspace to the registry");

upgrade.option("-l, --latest", "Upgrade to the latest version");

interface UpgradeOptions {
  latest: boolean;
}

upgrade.action(async (options: UpgradeOptions) => {
  const timer = logger.timer();

  logger.info("Upgrading ...").line();

  try {
    const module = await getModule();

    await module.init();

    await module.upgrader(options);

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
