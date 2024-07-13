import {PublishOptions} from "~/commands/publish";

import {Module} from "~/domain/module";

interface PublisherConfig {
}

abstract class Publisher<Config extends PublisherConfig> {
  module: Module;
  config?: Config;
  options?: PublishOptions;

  protected constructor(module: Module, config?: Config, options?: PublishOptions) {
    this.module = module;
    this.config = config;
    this.options = options;
  }

  abstract run: () => Promise<void>;
}

export type {
  PublisherConfig,
};

export default Publisher;
