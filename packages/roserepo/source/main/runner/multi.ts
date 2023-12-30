import BaseRunner from "./base";

interface MultiRunnerConfig {
  runners: BaseRunner<unknown>[];
}

class MultiRunner extends BaseRunner<MultiRunnerConfig> {
  run = async () => {
    if (!this.config.runners?.length) {
      throw new Error("No runners provided");
    }

    for (const runner of this.config.runners) {
      runner.initFrom(this);
    }

    if (this.config.parallel) {
      const promises = this.config.runners.map((runner) => {
        return runner.run();
      }) ?? [];

      if (this.config.throwOnError) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      return;
    }

    for (const runner of this.config.runners) {
      try {
        await runner.run();
      } catch (error) {
        if (this.config.throwOnError) {
          throw error;
        }
      }
    }
  };
}

export type {
  MultiRunnerConfig,
};

export default MultiRunner;