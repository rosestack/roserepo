import BaseRunner from "~monorepo/runner/base";

import RoserepoError from "~shared/error";

interface MultiRunnerConfig {
  runners: BaseRunner<unknown>[];
}

class MultiRunner extends BaseRunner<MultiRunnerConfig> {
  run = async () => {
    if ( !this.config.runners?.length ) {
      throw new RoserepoError("No runners provided");
    }

    for ( const runner of this.config.runners ) {
      runner.fromParent(this);
    }

    if ( this.config.parallel ) {
      const promises = this.config.runners.map((runner) => {
        return runner.run();
      }) ?? [];

      if ( this.config.throwOnError ) {
        await Promise.all(promises);
      } else {
        await Promise.allSettled(promises);
      }

      return;
    }

    for ( const runner of this.config.runners ) {
      try {
        await runner.run();
      } catch ( error ) {
        if ( this.config.throwOnError ) {
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