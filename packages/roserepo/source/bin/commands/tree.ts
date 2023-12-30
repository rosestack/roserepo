import {createCommand} from "commander";

import {logger} from "~shared/logger";

import Roserepo from "~/main";

const tree = createCommand("tree");

tree.description("Print the dependency tree of the monorepo");

interface TreeOptions {
}

tree.action(async (options: TreeOptions) => {
  const timer = logger.timer();

  logger.info("Printing dependency tree").line();

  const cwd = await Roserepo.cwd();

  if (!cwd) {
    logger.error("Could not find working directory");
    return;
  }

  const roserepo = new Roserepo(cwd);

  roserepo.first = true;

  try {
    await roserepo.init();
    await roserepo.tree(options);

    logger.line().info("Finished within", logger.mark(timer.end()), "ms");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
});

export type {
  TreeOptions,
};

export default tree;