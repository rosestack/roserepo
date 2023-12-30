import inquirer from "inquirer";

import {execa} from "execa";

import {PublishOptions} from "~bin/commands/publish";

import Roserepo from "~/main";

import {Filter} from "~shared/types";

const canBePublished = (roserepo: Roserepo) => {
  if (roserepo.isMicrorepo) {
    return false;
  }

  if (roserepo.packageJson?.version === undefined) {
    return false;
  }

  if (roserepo.packageJson?.private === true) {
    return roserepo.packageJson.publishConfig?.access !== undefined;
  }

  return true;
};

interface PublisherConfig {
  include?: Filter;
  exclude?: Filter;
  //
  beforePublish?: (roserepo: Roserepo) => (Promise<void> | void);
  afterPublish?: (roserepo: Roserepo) => (Promise<void> | void);
}

class Publisher {
  roserepo: Roserepo;
  options: PublishOptions;

  static getRoserepos = (roserepo: Roserepo, options: PublishOptions): Roserepo[] => {
    const roserepos: Roserepo[] = [];

    if (roserepo.isMicrorepo) {
      const filter = roserepo.reduceParentConfig<Filter[][]>((filter, roserepo) => {
        let include = roserepo.config?.publisher?.include ?? [] as any;
        let exclude = roserepo.config?.publisher?.exclude ?? [] as any;

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

    if (canBePublished(roserepo)) {
      roserepos.unshift(roserepo);
    }

    return roserepos;
  };

  private get config() {
    return this.roserepo.config?.publisher;
  }

  private get registry() {
    if (this.roserepo.packageJson?.publishConfig?.registry) {
      return this.roserepo.packageJson.publishConfig.registry;
    }

    if (this.options.registry) {
      return this.options.registry;
    }

    return "https://registry.npmjs.org";
  }

  constructor(roserepo: Roserepo, options: PublishOptions) {
    this.roserepo = roserepo;
    this.options = options;
  }

  private validate = () => new Promise<void>((resolve, reject) => {
    const name = this.roserepo.packageJson?.name;
    const version = this.roserepo.packageJson?.version;

    if (!name) {
      throw new Error("No name found in package.json.");
    }

    if (!version) {
      throw new Error("No version found in package.json.");
    }

    const childProcess = execa("npm", ["view", `${name}@${version}`, "--registry", this.registry], {
      cwd: this.roserepo.cwd,
      env: {
        "FORCE_COLOR": "3",
      },
      extendEnv: true,
      stdio: "ignore",
    });

    childProcess.stderr?.setEncoding("utf-8");
    childProcess.stdout?.setEncoding("utf-8");

    childProcess.stdout?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logout(message);
      }
    });
    childProcess.stderr?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logerr(message);
      }
    });

    childProcess.once("exit", (code) => {
      if (code === 0) {
        return reject("Package already exists in registry");
      }

      return resolve();
    });
    childProcess.once("error", (error) => {
      return reject(error);
    });
  });

  private push = () => new Promise<void>((resolve, reject) => {
    const args = ["publish", "--registry", this.registry];

    if (this.options.dry) {
      args.push("--dry-run");
    }

    const childProcess = execa("npm", args, {
      cwd: this.roserepo.cwd,
      env: {
        "FORCE_COLOR": "3",
      },
      extendEnv: true,
      stdio: [
        "inherit",
        "pipe",
        "pipe",
      ],
    });

    childProcess.stderr?.setEncoding("utf-8");
    childProcess.stdout?.setEncoding("utf-8");

    childProcess.stdout?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logout(message);
      }
    });
    childProcess.stderr?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for (const message of messages) {
        this.roserepo.logger.logerr(message);
      }
    });

    childProcess.once("exit", (code) => {
      if (code === 0) {
        return resolve();
      }

      return reject("Exited with non-zero exit code");
    });
    childProcess.once("error", (error) => {
      return reject(error);
    });
  });

  publish = async () => {
    try {
      const {confirmed} = await inquirer.prompt({
        name: "confirmed",
        type: "confirm",
        message: this.roserepo.logger.format("Are you sure you want to publish this package?"),
        prefix: this.roserepo.logger.config.symbol,
      });

      if (!confirmed) {
        return this.roserepo.logger.info("Cancelled");
      }

      if (this.config?.beforePublish) {
        await this.config.beforePublish(this.roserepo);
      }

      await this.validate();
      await this.push();

      if (this.config?.afterPublish) {
        await this.config.afterPublish(this.roserepo);
      }

      this.roserepo.logger.info("Published successfully");
    } catch (error) {
      this.roserepo.logger.error(error);
    }
  };
}

export type {
  PublisherConfig,
};

export default Publisher;