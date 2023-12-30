import ManyRunner, {ManyRunnerConfig} from "./many";
import PipelineRunner, {PipelineRunnerConfig} from "./pipeline";
import MultiRunner, {MultiRunnerConfig} from "./multi";

import {BaseRunnerConfig} from "./base";

const Runner = {
  many: (config?: BaseRunnerConfig<ManyRunnerConfig>) => {
    return new ManyRunner({
      parallel: true,
      throwOnError: true,
      restartOnError: false,
      ...config,
    });
  },
  pipeline: (config?: BaseRunnerConfig<PipelineRunnerConfig>) => {
    return new PipelineRunner({
      parallel: true,
      throwOnError: true,
      restartOnError: false,
      ...config,
    });
  },
  multi: (config: BaseRunnerConfig<MultiRunnerConfig>) => {
    return new MultiRunner(config);
  },
};

export default Runner;