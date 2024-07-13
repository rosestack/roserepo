import {loadPackage, PackageJson, loadConfig} from "roserc";

import {find} from "rosetil";

import {RunOptions} from "~/commands/run";
import {UpgradeOptions} from "~/commands/upgrade";
import {PublishOptions} from "~/commands/publish";
import {VersionOptions} from "~/commands/version";

import {findWorkspaces} from "~/utils/find";

import {WorkspaceFilter, WorkspaceFilterConfig, WorkspaceFilterOptions} from "~/utils/filter";

import {Module, ModuleConfig} from "./module";

import {Workspace} from "./workspace";

import {Runner} from "./runner";

import BaseRunner, {BaseRunnerConfig} from "./runner/base";

import RoserepoUpgrader, {RoserepoUpgraderConfig} from "./upgrade/roserepo";
import RoserepoPublisher, {RoserepoPublisherConfig} from "./publish/roserepo";
import RoserepoVersioner, {RoserepoVersionerConfig} from "./version/roserepo";
import {createPackageManager} from "~/utils/package-manager";

interface RoserepoConfig extends ModuleConfig, WorkspaceFilterConfig {
  env?: Record<string, string | number | boolean>;
  dotenv?: boolean | string | string[];
  //
  runner?: {
    [script: string]: BaseRunner<unknown>;
  };
  runnerConfig?: BaseRunnerConfig<unknown>;
  //
  upgrade?: RoserepoUpgraderConfig;
  publish?: RoserepoPublisherConfig;
  version?: RoserepoVersionerConfig;
}

class Roserepo extends Module {
  config?: RoserepoConfig;

  workspaces: Workspace[] = [];

  workspaceFilter: WorkspaceFilter;

  static load = async (cwd: string, packageJson?: PackageJson) => {
    if (!packageJson) {
      packageJson = await loadPackage(cwd);
    }

    return new Roserepo(cwd, packageJson);
  };

  constructor(cwd: string, packageJson: PackageJson) {
    super(cwd, packageJson, {
      prefix: "★",
    });
  }

  //

  workspacesLookup = (workspaceFilterOptions: WorkspaceFilterOptions) => {
    return this.workspaces.filter((workspace) => workspace.match(workspaceFilterOptions));
  };

  //

  hasRunner = (script: string) => {
    return Reflect.has(this.config?.runner ?? {}, script);
  };

  getRunner = (script: string) => {
    let runner = this.config?.runner?.[script];

    if (!runner) {
      runner = Runner.many();
    }

    return runner.clone();
  };

  //

  init = async () => {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    const configFile = await find({
      cwd: this.cwd,
      name: "roserepo.ts",
      traversal: "none",
    });

    if (configFile) {
      this.config = await loadConfig(configFile);
    }

    this.packageManager = createPackageManager(this);

    this.workspaceFilter = new WorkspaceFilter(this.config);

    const workspaceDirs = await findWorkspaces(this.cwd, this.packageJson);

    await Promise.all(workspaceDirs.map(async (workspaceDir) => {
      const exists = this.workspaces.find((workspace) => workspace.cwd === workspaceDir);

      if (exists) {
        return;
      }

      const workspace = await Workspace.load(workspaceDir);

      this.workspaces.push(workspace);
    }));

    await Promise.all(this.workspaces.map((workspace) => {
      workspace.roserepo = this;
    }));
  };

  runner = async (script: string, options: RunOptions) => {
    const runner = this.getRunner(script);

    runner.init(this, script, options);

    return runner.run();
  };

  upgrader = async (options: UpgradeOptions) => {
    const upgrader = new RoserepoUpgrader(this, options);

    return upgrader.run();
  };

  publisher = async (options: PublishOptions) => {
    const publisher = new RoserepoPublisher(this, options);

    return publisher.run();
  };

  versioner = async (options: VersionOptions) => {
    const versioner = new RoserepoVersioner(this, options);

    return versioner.run();
  };
}

const defineRoserepo = (config: RoserepoConfig) => {
  return config;
};

export type {
  RoserepoConfig,
};

export {
  defineRoserepo,
};

export {
  Roserepo,
};
