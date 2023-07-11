import inquirer from "inquirer";
import axios from "axios";

import { execa } from "execa";

import type Roserepo from "roserepo";

class Publisher {
  roserepo: Roserepo;

  constructor(roserepo: Roserepo) {
    this.roserepo = roserepo;
  }

  private validate = async () => {
    if ( !this.roserepo.packageJson ) {
      throw new Error("No package.json found.");
    }

    const { name, version } = this.roserepo.packageJson;

    if ( !name ) {
      throw new Error("No name found in package.json.");
    }

    if ( !version ) {
      throw new Error("No version found in package.json.");
    }

    // check if the version is already published

    const url = new URL(`${ name }/${ version }`, "https://registry.npmjs.org");

    const response = await axios.get(url.href, {
      validateStatus: () => true,
    });

    if ( response.status === 200 ) {
      throw new Error("This version is already published.");
    }
  };

  private publishToNpm = () => new Promise<void>((resolve, reject) => {
    const childProcess = execa("npm", ["publish"], {
      cwd: this.roserepo.cwd,
      env: {
        "FORCE_COLOR": "3",
      } as any,
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

      for ( const message of messages ) {
        this.roserepo.logger.logout(message);
      }
    });
    childProcess.stderr?.on("data", (data) => {
      const messages = data.toString().trim().split("\n");

      for ( const message of messages ) {
        this.roserepo.logger.logerr(message);
      }
    });

    childProcess.once("exit", (code) => {
      if ( code === 0 ) {
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
      const { confirmed } = await inquirer.prompt({
        name: "confirmed",
        type: "confirm",
        message: this.roserepo.logger.format("Are you sure you want to publish this workspace?"),
        prefix: this.roserepo.logger.config.symbol,
      });

      if ( !confirmed ) {
        return this.roserepo.logger.info("Publishing cancelled.");
      }

      if ( this.roserepo.config?.workspace?.publish?.beforePublish ) {
        await this.roserepo.config.workspace.publish.beforePublish(this.roserepo);
      }

      await this.validate();
      await this.publishToNpm();

      if ( this.roserepo.config?.workspace?.publish?.afterPublish ) {
        await this.roserepo.config.workspace.publish.afterPublish(this.roserepo);
      }

      this.roserepo.logger.info("Published successfully.");
    } catch ( error ) {
      this.roserepo.logger.error(error);
    }
  };
}

export default Publisher;