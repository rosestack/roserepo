import semver from "semver";
import inquirer from "inquirer";

import {VersionOptions} from "~/commands/version";

import {Module} from "~/domain/module";

interface VersionerConfig {
}

abstract class Versioner<Config extends VersionerConfig> {
  module: Module;
  config?: Config;
  options?: VersionOptions;

  protected constructor(module: Module, config?: Config, options?: VersionOptions) {
    this.module = module;
    this.config = config;
    this.options = options;
  }

  protected version = async () => {
    this.module.logger.info(`Versioning ${this.module.name}@${this.module.version}`).line();

    const version = this.module.version;

    const releases = [
      {
        name: `Patch ${semver.inc(version, "patch")}`,
        value: semver.inc(version, "patch"),
      },
      {
        name: `Prepatch ${semver.inc(version, "prepatch")}`,
        value: semver.inc(version, "prepatch"),
      },
      new inquirer.Separator(),
      {
        name: `Minor ${semver.inc(version, "minor")}`,
        value: semver.inc(version, "minor"),
      },
      {
        name: `Preminor ${semver.inc(version, "preminor")}`,
        value: semver.inc(version, "preminor"),
      },
      new inquirer.Separator(),
      {
        name: `Major ${semver.inc(version, "major")}`,
        value: semver.inc(version, "major"),
      },
      {
        name: `Premajor ${semver.inc(version, "premajor")}`,
        value: semver.inc(version, "premajor"),
      },
      new inquirer.Separator(),
      {
        name: `Prerelease ${semver.inc(version, "prerelease")}`,
        value: semver.inc(version, "prerelease"),
      },
      new inquirer.Separator(),
      {
        name: "Custom",
        value: "custom",
      },
    ];

    let {release} = await inquirer.prompt({
      type: "list",
      name: "release",
      prefix: this.module.logger.prefix(),
      message: "Select Release Type:",
      choices: releases.map((release) => {
        if (release instanceof inquirer.Separator) {
          return release;
        }

        return {
          name: release.name,
          value: release.value,
        };
      }),
      loop: false,
    });

    if (release === "custom") {
      const {custom} = await inquirer.prompt({
        type: "input",
        name: "custom",
        prefix: this.module.logger.prefix(),
        message: "Enter Custom Version:",
        validate: (custom) => {
          if (!semver.valid(custom)) {
            return "Invalid Semver Version";
          }

          return true;
        },
      });

      release = custom;
    }

    this.module.packageJson.version = release;

    await this.module.savePackageJson();

    this.module.logger.info(`Versioned ${this.module.name}@${release}`).line();
  };

  abstract run: () => Promise<void>;
}

export type {
  VersionerConfig,
};

export default Versioner;
