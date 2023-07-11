import type { BaseRunnerConfig } from "./base";

import type { MultiRunnerConfig } from "./multi";
import MultiRunner from "./multi";

import type { ManyRunnerConfig } from "./many";
import ManyRunner from "./many";

import type { PipelineRunnerConfig } from "./pipeline";
import PipelineRunner from "./pipeline";

class Runner {
  static multi = (config: BaseRunnerConfig<MultiRunnerConfig>) => {
    return new MultiRunner(config);
  };

  static many = (config: BaseRunnerConfig<ManyRunnerConfig>) => {
    return new ManyRunner(config);
  };

  static pipeline = (config: BaseRunnerConfig<PipelineRunnerConfig>) => {
    return new PipelineRunner(config);
  };
}

export default Runner;