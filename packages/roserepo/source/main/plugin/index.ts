import {Command} from "commander";

import Roserepo from "~/main";

abstract class Plugin<Options = Record<string, any>> {
  abstract name: string;
  abstract description: string;

  roserepo: Roserepo;

  protected constructor(roserepo: Roserepo) {
    this.roserepo = roserepo;
  }

  command(command: Command): Promise<void> | void {
  }

  abstract use(options: Options): any;
}

export default Plugin;