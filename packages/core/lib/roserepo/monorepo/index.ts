import type { RoserepoFilter } from "~/types";

import type BaseRunner from "./runner/base";

interface MonorepoConfig {
  inherit?: boolean;
  runner?: {
    [script: string]: BaseRunner<unknown>;
  };
  //
  include?: string | RegExp | RoserepoFilter[];
  exclude?: string | RegExp | RoserepoFilter[];
  //
  publish?: {
    include?: string | RegExp | RoserepoFilter[];
    exclude?: string | RegExp | RoserepoFilter[];
  };
  changeset?: {
    include?: string | RegExp | RoserepoFilter[];
    exclude?: string | RegExp | RoserepoFilter[];
  };
  upgrade?: {
    include?: string | RegExp | RoserepoFilter[];
    exclude?: string | RegExp | RoserepoFilter[];
    //
    excludeDependencies?: string[];
    respectPeerDependencies?: boolean;
  };
}

const defineMonorepo = (config: MonorepoConfig) => {
  return config;
};

export type {
  MonorepoConfig,
};

export {
  defineMonorepo,
};