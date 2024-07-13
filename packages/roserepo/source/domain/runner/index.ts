import BaseRunner, {BaseRunnerConfig} from "./base";

import ManyRunner, {ManyRunnerConfig} from "./many";
import PipelineRunner, {PipelineRunnerConfig} from "./pipeline";

const Runner = {
  many: (config: BaseRunnerConfig<ManyRunnerConfig> = {}) => new ManyRunner(config),
  pipeline: (config: BaseRunnerConfig<PipelineRunnerConfig> = {}) => new PipelineRunner(config),
};

export type {
  BaseRunnerConfig,
  ManyRunnerConfig,
  PipelineRunnerConfig,
};

export {
  BaseRunner,
  ManyRunner,
  PipelineRunner,
};

export {
  Runner,
};
