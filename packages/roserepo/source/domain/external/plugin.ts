import {Command} from "commander";

import {Module} from "~/domain/module";

abstract class Plugin<Options = Record<string, any>> {
  abstract name: string;
  abstract description: string;

  module: Module;

  protected constructor(module: Module) {
    this.module = module;
  }

  abstract command(command: Command): Promise<void> | void;

  abstract use(options: Options): any;
}

export {
  Plugin,
};
