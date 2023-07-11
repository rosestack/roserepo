import inquirer from "inquirer";

import semver from "semver";

import { parser, Changelog, Release } from "keep-a-changelog";

import type Roserepo from "~/roserepo";

import fs from "fs";

class Changeseter {
  roserepo: Roserepo;

  constructor(roserepo: Roserepo) {
    this.roserepo = roserepo;
  }

  updateVersion = async () => {
    const { confirmed } = await inquirer.prompt({
      name: "confirmed",
      type: "confirm",
      message: this.roserepo.logger.format("Do you want to update the version?"),
      prefix: this.roserepo.logger.config.symbol,
    });

    if ( !confirmed ) {
      return this.roserepo.logger.info("Skipping version update.");
    }

    if ( !this.roserepo.packageJson ) {
      throw new Error("No package.json found");
    }

    const version = this.roserepo.packageJson.version;

    if ( !version ) {
      throw new Error("No version found in package.json");
    }

    const releases = [
      {
        name: `Major ${ semver.inc(version, "major") }`,
        value: semver.inc(version, "major"),
      },
      {
        name: `Premajor ${ semver.inc(version, "premajor") }`,
        value: semver.inc(version, "premajor"),
      },
      new inquirer.Separator(),
      {
        name: `Minor ${ semver.inc(version, "minor") }`,
        value: semver.inc(version, "minor"),
      },
      {
        name: `Preminor ${ semver.inc(version, "preminor") }`,
        value: semver.inc(version, "preminor"),
      },
      new inquirer.Separator(),
      {
        name: `Patch ${ semver.inc(version, "patch") }`,
        value: semver.inc(version, "patch"),
      },
      {
        name: `Prepatch ${ semver.inc(version, "prepatch") }`,
        value: semver.inc(version, "prepatch"),
      },
      new inquirer.Separator(),
      {
        name: `Prerelease ${ semver.inc(version, "prerelease") }`,
        value: semver.inc(version, "prerelease"),
      },
      new inquirer.Separator(),
    ];

    const { release } = await inquirer.prompt({
      type: "list",
      name: "release",
      message: this.roserepo.logger.format("Select Release Type:"),
      prefix: this.roserepo.logger.config.symbol,
      choices: releases.map((release) => {
        if ( release instanceof inquirer.Separator ) {
          return release;
        }

        return {
          name: release.name,
          value: release.value,
        };
      }),
      loop: false,
    });

    this.roserepo.packageJson.version = release;

    return fs.promises.writeFile(this.roserepo.resolve("package.json"), JSON.stringify(this.roserepo.packageJson, null, 2));
  };

  updateChangelog = async () => {
    const { confirmed } = await inquirer.prompt({
      name: "confirmed",
      type: "confirm",
      message: this.roserepo.logger.format("Do you want to update the changelog?"),
      prefix: this.roserepo.logger.config.symbol,
    });

    if ( !confirmed ) {
      return this.roserepo.logger.info("Skipping changelog update.");
    }

    const version = this.roserepo.packageJson?.version;

    if ( !version ) {
      throw new Error("No version found in package.json");
    }

    const changelogFile = this.roserepo.resolve("changelog.md");

    let changelog: Changelog;

    if ( fs.existsSync(changelogFile) ) {
      try {
        changelog = parser(fs.readFileSync(this.roserepo.resolve("changelog.md"), "utf8"));
      } catch ( error: unknown ) {
        let cause = "unknown issue";

        if ( error instanceof Error ) {
          cause = error.message;
        }

        throw Error(`Invalid changelog.md file, ${ cause }`, {
          cause: error,
        });
      }
    } else {
      const { changelogTitle } = await inquirer.prompt({
        name: "changelogTitle",
        type: "input",
        message: this.roserepo.logger.format("Enter Changelog Title:"),
        prefix: this.roserepo.logger.config.symbol,
        default: this.roserepo.packageJson?.name,
      });

      const { changelogDescription } = await inquirer.prompt({
        name: "changelogDescription",
        type: "input",
        message: this.roserepo.logger.format("Enter Changelog Description:"),
        prefix: this.roserepo.logger.config.symbol,
        default: this.roserepo.packageJson?.description ?? "Changelog",
      });

      changelog = new Changelog(changelogTitle, changelogDescription ?? "Changelog");
    }

    const { releaseVersion } = await inquirer.prompt({
      name: "releaseVersion",
      type: "input",
      message: this.roserepo.logger.format("Enter Release Version:"),
      prefix: this.roserepo.logger.config.symbol,
      default: version,
    });

    const { releaseDate } = await inquirer.prompt({
      name: "releaseDate",
      type: "input",
      message: this.roserepo.logger.format("Enter Release Date:"),
      prefix: this.roserepo.logger.config.symbol,
      default: new Date().toISOString().split("T")[0],
    });

    const { releaseDescription } = await inquirer.prompt({
      name: "releaseDescription",
      type: "input",
      prefix: this.roserepo.logger.config.symbol,
      message: this.roserepo.logger.format("Enter Release Description:"),
    });

    const release = new Release(releaseVersion, releaseDate, releaseDescription);

    let { addChange } = await inquirer.prompt({
      name: "addChange",
      type: "confirm",
      prefix: this.roserepo.logger.config.symbol,
      message: this.roserepo.logger.format("Do you want to add a change?"),
    });

    while ( addChange ) {
      const { changeType, changeDescription } = await inquirer.prompt([
        {
          name: "changeType",
          type: "list",
          prefix: this.roserepo.logger.config.symbol,
          message: this.roserepo.logger.format("Select Change Type:"),
          choices: [
            {
              name: "Added",
              value: "added",
            },
            {
              name: "Changed",
              value: "changed",
            },
            {
              name: "Removed",
              value: "removed",
            },
            {
              name: "Fixed",
              value: "fixed",
            },
            {
              name: "Deprecated",
              value: "deprecated",
            },
            {
              name: "Security",
              value: "security",
            },
          ],
          loop: false,
        },
        {
          name: "changeDescription",
          type: "input",
          prefix: this.roserepo.logger.config.symbol,
          message: this.roserepo.logger.format("Enter Change Description:"),
        },
      ]);

      release.addChange(changeType, changeDescription);

      const { addMore } = await inquirer.prompt({
        name: "addMore",
        type: "confirm",
        prefix: this.roserepo.logger.config.symbol,
        message: this.roserepo.logger.format("Do you want to add more changes?"),
      });

      addChange = addMore;
    }

    changelog.addRelease(release);

    changelog.sortReleases();

    changelog.format = "markdownlint";

    return fs.promises.writeFile(changelogFile, changelog.toString());
  };

  changeset = async () => {
    try {
      await this.updateVersion();
      await this.updateChangelog();

      this.roserepo.logger.info("Changeset successfully.");
    } catch ( error ) {
      this.roserepo.logger.error(error);
    }
  };
}

export default Changeseter;