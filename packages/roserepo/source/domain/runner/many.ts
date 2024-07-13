import BaseRunner from "./base";

import Task from "./helper/task";

interface ManyRunnerConfig {
  limit?: number;
}

class ManyRunner extends BaseRunner<ManyRunnerConfig> {
  chunk = (array: Task[], limit: number) => {
    return array.reduce<Task[][]>((tasks, _, i) => {
      if (i % limit === 0) {
        tasks.push(array.slice(i, i + limit));
      }

      return tasks;
    }, []);
  };

  run = async () => {
    const workspaces = this.filteredWorkspaces().filter((workspace) => {
      return workspace.hasExecutor(this.script, this);
    });

    if (workspaces.length === 0) {
      this.roserepo.logger.info("No workspaces to run");
      return;
    }

    const limit = this.config.limit || workspaces.length;

    const tasks = workspaces.map((workspace) => new Task({
      workspace,
      runner: this,
      script: this.script,
      runOptions: this.runOptions,
    }));

    this.roserepo.logger.info(`Running ${tasks.length} tasks`).line();

    const chunks = this.chunk(tasks, limit);

    for (const chunk of chunks) {
      await this.runTasks(chunk);
    }
  };
}

export type {
  ManyRunnerConfig,
};

export default ManyRunner;
