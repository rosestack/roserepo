import {Workspace} from "~/domain/workspace";

import {PublishOptions} from "~/commands/publish";

import {Spawner} from "~/utils/spawner";

import Publisher, {PublisherConfig} from "./publisher";

interface WorkspacePublisherConfig extends PublisherConfig {
  beforePublish?: (workspace: Workspace) => Promise<void> | void;
  afterPublish?: (workspace: Workspace) => Promise<void> | void;
}

class WorkspacePublisher extends Publisher<WorkspacePublisherConfig> {
  constructor(public workspace: Workspace, options?: PublishOptions) {
    super(workspace, workspace.config?.publish, options);
  }

  private publish = async () => {
    this.module.logger.info("Publishing...");

    const spawner = new Spawner(this.workspace);

    const {command, args} = this.workspace.packageManager.publish({
      tag: this.options?.tag,
      access: this.options?.access,
      dryRun: this.options?.dryRun,
    });

    return spawner.spawn({
      command,
      args,
    });
  };

  run = async () => {
    if (this.config?.beforePublish) {
      await this.config.beforePublish(this.workspace);
    }

    await this.publish();

    if (this.config?.afterPublish) {
      await this.config.afterPublish(this.workspace);
    }
  };
}

export type {
  WorkspacePublisherConfig,
};

export default WorkspacePublisher;
