import {normalize} from "rosetil";

import {PackageJson, loadDotenv} from "roserc";

import {RunOptions} from "~/commands/run";
import {UpgradeOptions} from "~/commands/upgrade";
import {PublishOptions} from "~/commands/publish";
import {VersionOptions} from "~/commands/version";

import {UpgraderConfig} from "~/domain/upgrade/upgrader";
import {PublisherConfig} from "~/domain/publish/publisher";
import {VersionerConfig} from "~/domain/version/versioner";

import {PackageManager} from "~/utils/package-manager";

import Logger, {LoggerConfig} from "~/shared/logger";

import path from "node:path";
import fs from "node:fs";

interface ModuleConfig {
  env?: Record<string, string | number | boolean>;
  dotenv?: boolean | string | string[];
  //
  upgrade?: UpgraderConfig;
  publish?: PublisherConfig;
  version?: VersionerConfig;
}

abstract class Module {
  cwd: string;

  packageJson: PackageJson;

  logger: Logger;

  packageManager: PackageManager;

  initialized = false;

  abstract config?: ModuleConfig;

  get name() {
    return this.packageJson.name;
  }

  get version() {
    return this.packageJson.version;
  }

  protected constructor(cwd: string, packageJson: PackageJson, logger?: Partial<LoggerConfig>) {
    this.cwd = normalize(cwd);
    this.packageJson = packageJson;
    this.logger = new Logger({
      name: this.packageJson.name,
      color: Logger.uniqueColor(),
      ...logger,
    });
  }

  //

  savePackageJson = async () => {
    const packageJsonPath = this.resolve("package.json");
    return fs.promises.writeFile(packageJsonPath, JSON.stringify(this.packageJson, null, 2));
  };

  //

  resolve = (...paths: string[]) => {
    return normalize(path.resolve(this.cwd, ...paths));
  };

  //

  io = {
    hasFile: (file: string) => {
      return fs.existsSync(this.resolve(file));
    },
  };

  //

  loadDotenv = async () => {
    const env = {};

    if (!this.config?.dotenv) {
      return env;
    }

    const dotEnvFiles = [
      ".env",
    ];

    if (typeof this.config?.dotenv === "string") {
      dotEnvFiles.push(this.config.dotenv);
    } else if (Array.isArray(this.config?.dotenv)) {
      dotEnvFiles.push(...this.config.dotenv);
    }

    for (const dotEnvFile of dotEnvFiles) {
      const dotEnvPath = this.resolve(dotEnvFile);

      if (fs.existsSync(dotEnvPath)) {
        const dotenv = await loadDotenv(dotEnvPath);
        Object.assign(env, dotenv);
      }
    }

    return env;
  };

  getEnv = async () => {
    const env = {};

    const dotenv = await this.loadDotenv();

    Object.assign(env, dotenv);

    const configEnv = this.config?.env ?? {};

    for (const key in configEnv) {
      env[key] = String(configEnv[key]);
    }

    return env;
  };

  //

  abstract init(): Promise<void>;

  abstract runner(script: string, options: RunOptions): Promise<void>;

  abstract upgrader(options: UpgradeOptions): Promise<void>;

  abstract publisher(options: PublishOptions): Promise<void>;

  abstract versioner(options: VersionOptions): Promise<void>;
}

export type {
  ModuleConfig,
};

export {
  Module,
};
