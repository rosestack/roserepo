import type Roserepo from "~/roserepo";
import type BaseExecutor from "./executor/base";

interface WorkspaceConfig {
  executor?: {
    [script: string]: BaseExecutor<unknown>;
  };
  publish?: {
    beforePublish?: (roserepo: Roserepo) => (Promise<void> | void);
    afterPublish?: (roserepo: Roserepo) => (Promise<void> | void);
  };
  upgrade?: {
    excludeDependencies?: string[];
    respectPeerDependencies?: boolean;
  };
}

const defineWorkspace = (config: WorkspaceConfig) => {
  return config;
};

export type {
  WorkspaceConfig,
};

export {
  defineWorkspace,
};