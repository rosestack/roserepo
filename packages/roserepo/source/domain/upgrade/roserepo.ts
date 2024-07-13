import inquirer from "inquirer";

import {UpgradeOptions} from "~/commands/upgrade";

import {Module} from "~/domain/module";
import {Roserepo} from "~/domain/roserepo";

import {WorkspaceFilter, PriorityWorkspaceFilter, WorkspaceFilterConfig} from "~/utils/filter";

import {logger} from "~/shared/logger";

import Upgrader, {UpgraderConfig} from "./upgrader";

interface RoserepoUpgraderConfig extends WorkspaceFilterConfig, UpgraderConfig {
}

class RoserepoUpgrader extends Upgrader<RoserepoUpgraderConfig> {
  constructor(private roserepo: Roserepo, options?: UpgradeOptions) {
    super(roserepo, roserepo.config.upgrade, options);
  }

  isModuleUpgradable = (module: Module) => {
    const dependencies = {
      ...module.packageJson.dependencies,
      ...module.packageJson.devDependencies,
    };

    if (Object.keys(dependencies).length === 0) {
      return false;
    }

    return Object.values(dependencies).filter(this.isVersionUpgradable).length > 0;
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

    priorityFilter.condition = this.isModuleUpgradable;

    const filteredWorkspaces = this.roserepo.workspaces.filter(priorityFilter.match) as Module[];

    if (this.isModuleUpgradable(this.roserepo)) {
      filteredWorkspaces.unshift(this.roserepo);
    }

    const {selectedWorkspaces} = await inquirer.prompt<{ selectedWorkspaces: Module[]; }>({
      type: "checkbox",
      name: "selectedWorkspaces",
      prefix: this.roserepo.logger.prefix(),
      message: "Select workspaces to upgrade",
      choices: filteredWorkspaces.map((workspace) => ({
        checked: true,
        name: workspace.logger.mark(workspace.name),
        value: workspace,
      })),
    });

    if (selectedWorkspaces.length === 0) {
      logger.info("No workspaces selected to upgrade").line();
      return;
    }

    logger.line().info(`Upgrading ${selectedWorkspaces.length} `).line();

    for (const module of selectedWorkspaces) {
      if (module === this.roserepo) {
        const dependencies = this.filterDependencies(this.roserepo.packageJson.dependencies, this.config?.dependencies);
        const devDependencies = this.filterDependencies(this.roserepo.packageJson.devDependencies, this.config?.devDependencies);

        await this.upgrade({
          dependencies,
          devDependencies,
        });

        continue;
      }

      await module.upgrader(this.options);
    }
  };
}

export type {
  RoserepoUpgraderConfig,
};

export default RoserepoUpgrader;
