import inquirer from "inquirer";

import {VersionOptions} from "~/commands/version";

import {Module} from "~/domain/module";
import {Roserepo} from "~/domain/roserepo";

import {WorkspaceFilterConfig, WorkspaceFilter, PriorityWorkspaceFilter} from "~/utils/filter";

import Versioner, {VersionerConfig} from "./versioner";

interface RoserepoVersionerConfig extends WorkspaceFilterConfig, VersionerConfig {
}

class RoserepoVersioner extends Versioner<RoserepoVersionerConfig> {
  constructor(public roserepo: Roserepo, options?: VersionOptions) {
    super(roserepo, roserepo.config.version, options);
  }

  isModuleVersionable = (module: Module) => {
    return module.packageJson.version !== undefined;
  };

  run = async () => {
    const filter = new WorkspaceFilter({
      include: this.config?.include,
      exclude: this.config?.exclude,
    });

    const priorityFilter = new PriorityWorkspaceFilter(
      filter,
      this.roserepo.workspaceFilter,
    );

    priorityFilter.condition = this.isModuleVersionable;

    const filteredWorkspaces = this.roserepo.workspaces.filter(priorityFilter.match) as Module[];

    if (this.isModuleVersionable(this.roserepo)) {
      filteredWorkspaces.unshift(this.roserepo);
    }

    const {selectedWorkspaces} = await inquirer.prompt<{ selectedWorkspaces: Module[]; }>({
      type: "checkbox",
      name: "selectedWorkspaces",
      prefix: this.roserepo.logger.prefix(),
      message: "Select workspaces to version",
      choices: filteredWorkspaces.map((workspace) => ({
        name: `${workspace.name}@${workspace.version}`,
        value: workspace,
        checked: true,
      })),
    });

    if (selectedWorkspaces.length === 0) {
      this.roserepo.logger.info("No workspaces selected to publish").line();
      return;
    }

    this.roserepo.logger.line().info(`Publishing ${selectedWorkspaces.length} workspaces`).line();

    for (const workspace of selectedWorkspaces) {
      if (workspace === this.roserepo) {
        await this.version();
        continue;
      }

      await workspace.versioner(this.options);
    }
  };
}

export type {
  RoserepoVersionerConfig,
};

export default RoserepoVersioner;
