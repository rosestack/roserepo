import BaseExecutor from "./base";

interface MultiExecutorConfig {
  executors: BaseExecutor<unknown>[];
  throwOnError?: boolean;
  parallel?: boolean;
}

class MultiExecutor extends BaseExecutor<MultiExecutorConfig> {
  execute = async () => {
    if (!this.config.executors?.length) {
      throw new Error("No executor provided");
    }

    for (const executor of this.config.executors) {
      executor.initFrom(this);
    }

    if (this.config.parallel) {
      const promises = this.config.executors.map((executor) => {
        return executor.execute();
      });

      if (this.config.throwOnError) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      return;
    }

    for (const executor of this.config.executors) {
      try {
        await executor.execute();
      } catch (error) {
        if (this.config.throwOnError) {
          throw error;
        }
      }
    }
  };
}

export type {
  MultiExecutorConfig,
};

export default MultiExecutor;