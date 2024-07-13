import {PackageJson, loadPackage, loadConfig} from "roserc";

import {find, match, normalize} from "rosetil";

import {RunOptions} from "~/commands/run";
import {UpgradeOptions} from "~/commands/upgrade";
import {PublishOptions} from "~/commands/publish";
import {VersionOptions} from "~/commands/version";

import {findRoot} from "~/utils/find";

import {createPackageManager} from "~/utils/package-manager";

import {WorkspaceFilterOptions} from "~/utils/filter";

import {Module, ModuleConfig} from "./module";

import {Roserepo} from "./roserepo";

import {BaseRunner} from "./runner";

import {Executor} from "./executor";

import BaseExecutor, {BaseExecutorConfig} from "./executor/base";

import {Cache} from "./cache";

import WorkspaceUpgrader, {WorkspaceUpgraderConfig} from "./upgrade/workspace";
import WorkspacePublisher, {WorkspacePublisherConfig} from "./publish/workspace";
import WorkspaceVersioner, {WorkspaceVersionerConfig} from "./version/workspace";

import path from "node:path";

interface WorkspaceConfig extends ModuleConfig {
  executor?: {
    [script: string]: BaseExecutor<unknown>;
  };
  executorConfig?: BaseExecutorConfig<unknown>;
  //
  upgrade?: WorkspaceUpgraderConfig;
  publish?: WorkspacePublisherConfig;
  version?: WorkspaceVersionerConfig;
}

class Workspace extends Module {
  config?: WorkspaceConfig;

  roserepo?: Roserepo;

  static load = async (cwd: string, packageJson?: PackageJson) => {
    if (!packageJson) {
      packageJson = await loadPackage(cwd);
    }

    return new Workspace(cwd, packageJson);
  };

  constructor(cwd: string, packageJson: PackageJson) {
    super(cwd, packageJson, {
      prefix: "→",
    });
  }

  //

  rootResolve = (...paths: string[]) => {
    if (this.roserepo) {
      return this.roserepo.resolve(...paths);
    }

    return this.resolve(...paths);
  };

  //

  match = (matchFilter: WorkspaceFilterOptions) => {
    if (matchFilter.match === "name") {
      return match(this.name, matchFilter.pattern);
    }

    let matchRelative = false;

    if (this.roserepo) {
      const relative = path.relative(this.roserepo.cwd, this.cwd);
      matchRelative = match(normalize(relative), matchFilter.pattern);
    }

    const matchCwd = match(this.cwd, matchFilter.pattern);

    return matchCwd || matchRelative;
  };

  //

  hasExecutor = (script: string, runner?: BaseRunner<unknown>) => {
    if (Reflect.has(this.config?.executor ?? {}, script)) {
      return true;
    }

    if (Reflect.has(this.packageJson?.scripts ?? {}, script)) {
      return true;
    }

    return runner?.config?.executor !== undefined;
  };

  getExecutor = (script: string, runner?: BaseRunner<unknown>) => {
    let executor = this.config?.executor?.[script];

    if (!executor) {
      executor = runner?.config?.executor;
    }

    if (!executor) {
      executor = Executor.script({
        script,
      });
    }

    return executor.clone();
  };

  //

  init = async () => {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    if (!this.roserepo) {
      const root = await findRoot(this.cwd);

      if (root) {
        const roserepo = new Roserepo(root.cwd, root.packageJson);

        const workspaces = Array.from(root.workspaces.entries()).map(([path, packageJson]) => {
          return new Workspace(path, packageJson);
        });

        roserepo.workspaces = [this, ...workspaces];

        await roserepo.init();

        this.roserepo = roserepo;
      }
    }

    this.packageManager = createPackageManager(this);

    const configFile = await find({
      cwd: this.cwd,
      name: "workspace.ts",
      traversal: "none",
    });

    if (configFile) {
      this.config = await loadConfig(configFile);
    }
  };

  //

  runner = async (script: string, options: RunOptions, runner?: BaseRunner<unknown>) => {
    await this.init();

    if (!runner && this.roserepo) {
      return this.roserepo.runner(script, {
        ...options,
        for: [this.name],
      });
    }

    if (!this.hasExecutor(script, runner)) {
      throw new Error(`No executor found for ${script}`);
    }

    const executor = this.getExecutor(script, runner);

    executor.init(this, script, options, runner);

    const caches = executor.getCache();

    if (caches.length) {
      if (options.cache === false) {
        this.logger.info(`Executing ${this.logger.mark(script)}, cache disabled`);

        await executor.execute();

        return;
      }

      const multiCache = Cache.multi({
        caches,
      });

      multiCache.init(this, script);

      const match = await multiCache.compare();

      if (match) {
        this.logger.info(`Skipping ${this.logger.mark(script)}, cache hit`);
        return;
      }

      this.logger.info(`Executing ${this.logger.mark(script)}, cache miss`);

      await executor.execute();
      await multiCache.save();

      return;
    }

    await executor.execute();
  };

  upgrader = async (options: UpgradeOptions) => {
    await this.init();

    const upgrader = new WorkspaceUpgrader(this, options);

    return upgrader.run();
  };

  publisher = async (options: PublishOptions) => {
    await this.init();

    const publisher = new WorkspacePublisher(this, options);

    return publisher.run();
  };

  versioner = async (options: VersionOptions) => {
    await this.init();

    const versioner = new WorkspaceVersioner(this, options);

    return versioner.run();
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

export {
  Workspace,
};
