import BaseRunner from "~monorepo/runner/base";

type ManyRunnerConfig = unknown;

class ManyRunner extends BaseRunner<ManyRunnerConfig> {
  run = async () => {
    const filteredRoserepos = this.applyFilter(this.roserepos);

    if ( filteredRoserepos.length === 0 ) {
      return this.logger.warn(`Found no tasks to run ${ this.logger.mark(this.script) }`);
    }

    this.logger.info(`Running ${ filteredRoserepos.length } tasks`).line();

    const tasks = this.createTasks(filteredRoserepos, this.script, this.options);

    await this.runTasks(tasks);

    this.logger.line().info(`Finished running ${ this.logger.mark(this.script) }`);
  };
}

export type {
  ManyRunnerConfig,
};

export default ManyRunner;