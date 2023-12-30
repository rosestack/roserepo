import inquirer from "inquirer";
import semver from "semver";

import {VersionOptions} from "~bin/commands/version";

import Roserepo from "~/main";

import {Filter} from "~shared/types";

import fs from "fs";

interface VersionerConfig {
  include?: Filter;
  exclude?: Filter;
}

const canBeVersioned = (roserepo: Roserepo) => {
  return roserepo.packageJson && roserepo.packageJson.version;
};

class Versioner {
  roserepo: Roserepo;
  options: VersionOptions;

  static getRoserepos = (roserepo: Roserepo, options: VersionOptions): Roserepo[] => {
    const roserepos: Roserepo[] = [];

    if (roserepo.isMicrorepo) {
      const filter = roserepo.reduceParentConfig<Filter[][]>((filter, roserepo) => {
        let include = roserepo.config?.versioner?.include ?? [] as any;
        let exclude = roserepo.config?.versioner?.exclude ?? [] as any;

        if (!Array.isArray(include)) {
          include = [include];
        }

        if (!Array.isArray(exclude)) {
          exclude = [exclude];
        }

        if (include.length === 0 && exclude.length === 0) {
          return filter;
        }

        filter.push([include, exclude]);

        return filter;
      }, []);

      const children = roserepo.filterChildren({
        monorepoDepth: 1,
        microrepoDepth: 1,
        workspaceDepth: 1,
      });

      const filteredChildren = roserepo.filterPriority(children, filter);

      for (const child of filteredChildren) {
        roserepos.push(...this.getRoserepos(child, options));
      }
    }

    if (canBeVersioned(roserepo)) {
      roserepos.unshift(roserepo);
    }

    return roserepos;
  };

  constructor(roserepo: Roserepo, options: VersionOptions) {
    this.roserepo = roserepo;
    this.options = options;
  }

  version = async () => {
    try {
      if (!this.roserepo.packageJson) {
        throw new Error("No package.json found");
      }

      if (!this.roserepo.packageJson.version) {
        throw new Error("No version found in package.json");
      }

      const {confirmed} = await inquirer.prompt({
        name: "confirmed",
        type: "confirm",
        message: this.roserepo.logger.format("Are you sure you want to change the version?"),
        prefix: this.roserepo.logger.config.symbol,
      });

      if (!confirmed) {
        return this.roserepo.logger.info("Skipping version update.");
      }

      const version = this.roserepo.packageJson.version;

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
        message: this.roserepo.logger.format("Select Release Type:"),
        prefix: this.roserepo.logger.config.symbol,
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
          message: this.roserepo.logger.format("Enter Custom Version:"),
          prefix: this.roserepo.logger.config.symbol,
          validate: (custom) => {
            if (!semver.valid(custom)) {
              return "Invalid Semver Version";
            }

            return true;
          },
        });

        release = custom;
      }

      this.roserepo.packageJson.version = release;

      await fs.promises.writeFile(this.roserepo.resolve("package.json"), JSON.stringify(this.roserepo.packageJson, null, 2));

      this.roserepo.logger.info(`Version updated to ${this.roserepo.logger.mark(release)}`);
    } catch (error) {
      this.roserepo.logger.error(error);
    }
  };
}

export type {
  VersionerConfig,
};

export default Versioner;