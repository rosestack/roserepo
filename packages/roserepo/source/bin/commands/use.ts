import {createCommand} from "commander";

import {logger} from "~shared/logger";

import Roserepo from "~/main";

const use = createCommand("use");

use.description("Use roserepo plugin");

use.argument("<plugin>", "Plugin to use");

use.argument("[args...]", "Options for the plugin");

use.allowUnknownOption();

use.action(async (pluginName: string, args: string[]) => {
  const possiblePlugins = [
    `@roserepo/${pluginName}`,
    `roserepo-plugin-${pluginName}`,
    `roserepo-${pluginName}`,
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

  const cwd = await Roserepo.cwd();

  if (!cwd) {
    logger.error("Could not find working directory");
    return;
  }

  const roserepo = new Roserepo(cwd);

  roserepo.first = true;

  try {
    await roserepo.init();

    await import(plugin).then(async (plugin) => {
      const pluginInstance = new plugin.default(roserepo);

      const command = createCommand(pluginInstance.name);

      command.description(pluginInstance.description);

      await pluginInstance.command(command);

      command.action(async (options) => {
        return pluginInstance.use(options);
      });

      await command.parseAsync(args, {
        from: "user",
      });
    });

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export default use;