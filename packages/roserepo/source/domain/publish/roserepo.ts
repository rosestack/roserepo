import inquirer from "inquirer";

import {PublishOptions} from "~/commands/publish";

import {Roserepo} from "~/domain/roserepo";
import {Workspace} from "~/domain/workspace";

import {WorkspaceFilterConfig, WorkspaceFilter, PriorityWorkspaceFilter} from "~/utils/filter";

import Publisher from "./publisher";

interface RoserepoPublisherConfig extends WorkspaceFilterConfig {
  beforePublish?: (roserepo: Roserepo) => Promise<void> | void;
  afterPublish?: (roserepo: Roserepo) => Promise<void> | void;
}

class RoserepoPublisher extends Publisher<RoserepoPublisherConfig> {
  constructor(public roserepo: Roserepo, options?: PublishOptions) {
    super(roserepo, roserepo.config.upgrade, options);
  }

  isWorkspacePublishable = (workspace: Workspace) => {
    if (!workspace.packageJson.version) {
      return false;
    }

    return !workspace.packageJson.private;
  };

  run = async () => {
    if (this.config?.beforePublish) {
      await this.config.beforePublish(this.roserepo);
    }

    const filter = new WorkspaceFilter({
      include: this.config?.include,
      exclude: this.config?.exclude,
    });

    const priorityFilter = new PriorityWorkspaceFilter(
      filter,
      this.roserepo.workspaceFilter,
    );

    priorityFilter.condition = this.isWorkspacePublishable;

    const filteredWorkspaces = this.roserepo.workspaces.filter(priorityFilter.match);

    const {selectedWorkspaces} = await inquirer.prompt<{ selectedWorkspaces: Workspace[]; }>({
      type: "checkbox",
      name: "selectedWorkspaces",
      prefix: this.roserepo.logger.prefix(),
      message: "Select workspaces to publish",
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
      await workspace.publisher(this.options);
    }

    if (this.config?.afterPublish) {
      await this.config.afterPublish(this.roserepo);
    }
  };
}

export type {
  RoserepoPublisherConfig,
};

export default RoserepoPublisher;
