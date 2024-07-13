import {Workspace} from "~/domain/workspace";

import {UpgradeOptions} from "~/commands/upgrade";

import Upgrader, {UpgraderConfig} from "./upgrader";

interface WorkspaceUpgraderConfig extends UpgraderConfig {
}

class WorkspaceUpgrader extends Upgrader<WorkspaceUpgraderConfig> {
  constructor(public workspace: Workspace, options?: UpgradeOptions) {
    super(workspace, workspace.config?.upgrade, options);
  }

  run = async () => {
    const dependencies = this.filterDependencies(
      this.workspace.packageJson.dependencies,
      this.config?.dependencies,
      this.workspace.roserepo?.config?.upgrade?.dependencies, {
        exclude: this.workspace.roserepo?.workspaces.map((workspace) => workspace.name),
      },
    );

    const devDependencies = this.filterDependencies(
      this.workspace.packageJson.devDependencies,
      this.config?.devDependencies,
      this.workspace.roserepo?.config?.upgrade?.devDependencies, {
        exclude: this.workspace.roserepo?.workspaces.map((workspace) => workspace.name),
      },
    );

    await this.upgrade({
      dependencies,
      devDependencies,
    });
  };
}

export type {
  WorkspaceUpgraderConfig,
};

export default WorkspaceUpgrader;
