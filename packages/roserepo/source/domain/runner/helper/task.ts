import {Workspace} from "~/domain/workspace";

import {BaseRunner} from "~/domain/runner";

import {RunOptions} from "~/commands/run";

interface TaskConfig {
  workspace: Workspace;
  runner: BaseRunner<unknown>;
  script: string;
  runOptions: RunOptions;
  skipCache?: boolean;
}

class Task {
  workspace: Workspace;
  runner: BaseRunner<unknown>;
  script: string;
  runOptions: RunOptions;

  constructor(config: TaskConfig) {
    this.workspace = config.workspace;
    this.runner = config.runner;
    this.script = config.script;
    this.runOptions = config.runOptions;
  }
}

export type {
  TaskConfig,
};

export default Task;
