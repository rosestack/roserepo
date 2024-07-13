import {createCommand} from "commander";

import {logger} from "~/shared/logger";

import {getModule} from "./shared/utils";

const use = createCommand("use");

use.argument("<plugin>", "Plugin to use");

use.argument("[args...]", "Options for the plugin");

use.allowUnknownOption();

use.action(async (name: string, args: string[]) => {
  const possiblePlugins = [
    `@roserepo/${name}`,
    `roserepo-plugin-${name}`,
    `roserepo-${name}`,
  ];

  const plugin = possiblePlugins.find((plugin) => {
    try {
      require.resolve(plugin);
      return true;
    } catch (error) {
      return false;
    }
  });

  if (!plugin) {
    logger.error(`Plugin with name ${logger.mark(plugin)} not found`);
    return;
  }

  const timer = logger.timer();

  logger.info("Using plugin", logger.mark(plugin)).line();

  try {
    const module = await getModule();

    await module.init();

    await import(plugin).then(async (plugin) => {
      const instance = new plugin.default(module);

      if (instance.command) {
        const program = createCommand();
        await instance.command(program);
        program.parse(args);
      }

      if (instance.use) {
        await instance.use(args);
      }
    });

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export default use;
