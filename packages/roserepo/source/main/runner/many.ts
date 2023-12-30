import BaseRunner from "./base";

interface ManyRunnerConfig {
  limit?: number;
}

class ManyRunner extends BaseRunner<ManyRunnerConfig> {
  override run = async () => {
    const filteredRoserepos = this.applyFilter(this.roserepos);

    if (filteredRoserepos.length === 0) {
      return this.roserepo.logger.warn(`Found no tasks to run ${this.roserepo.logger.mark(this.script)}`);
    }

    this.roserepo.logger.info(`Running ${filteredRoserepos.length} tasks`);

    const tasks = this.createTasks(filteredRoserepos, this.script, this.options);

    if (this.config.limit) {
      let index = 0;

      while (index < tasks.length) {
        const limit = Math.min(this.config.limit, tasks.length - index);

        await this.runTasks(tasks.slice(index, index + limit));

        index += limit;
      }
    } else {
      await this.runTasks(tasks);
    }

    this.roserepo.logger.info("Finished");
  };
}

export type {
  ManyRunnerConfig,
};

export default ManyRunner;