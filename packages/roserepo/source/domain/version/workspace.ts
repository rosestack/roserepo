import {Workspace} from "~/domain/workspace";

import {VersionOptions} from "~/commands/version";

import Versioner, {VersionerConfig} from "./versioner";

interface WorkspaceVersionerConfig extends VersionerConfig {
  beforeVersion?: (workspace: Workspace) => Promise<void> | void;
  afterVersion?: (workspace: Workspace) => Promise<void> | void;
}

class WorkspaceVersioner extends Versioner<WorkspaceVersionerConfig> {
  constructor(public workspace: Workspace, options?: VersionOptions) {
    super(workspace, workspace.config?.version, options);
  }

  run = async () => {
    if (this.config?.beforeVersion) {
      await this.config.beforeVersion(this.workspace);
    }

    await this.version();

    if (this.config?.afterVersion) {
      await this.config.afterVersion(this.workspace);
    }
  };
}

export type {
  WorkspaceVersionerConfig,
};

export default WorkspaceVersioner;
