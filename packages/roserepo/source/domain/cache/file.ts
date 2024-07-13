import BaseCache from "./base";

import glob, {Pattern} from "fast-glob";

import crypto from "node:crypto";
import fs from "node:fs";

interface Disclaimer {
  regex: RegExp;
  value: string;
}

interface FileCacheConfig {
  include?: Pattern[];
  exclude?: Pattern[];
}

class FileCache extends BaseCache<FileCacheConfig> {
  private disclaimers: Disclaimer[] = [];

  private createDisclaimers = () => {
    if (this.workspace.roserepo) {
      this.disclaimers.push({
        regex: RegExp(/\{root}/, "gi"),
        value: this.workspace.roserepo.cwd,
      });
    }

    this.disclaimers.push({
      regex: RegExp(/\{cwd}/, "gi"),
      value: this.workspace.cwd,
    });
  };

  private replaceDisclaimer = (value: string) => {
    let newValue = value;

    this.disclaimers.forEach((disclaimer) => {
      newValue = newValue.replace(disclaimer.regex, disclaimer.value);
    });

    return newValue;
  };

  private checksum = async (file: string) => {
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(file);

      stream.on("data", (data) => {
        hash.update(data);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  };

  hash = async () => {
    this.createDisclaimers();

    const include = (this.config.include ?? []).map((pattern) => this.replaceDisclaimer(pattern));
    const exclude = (this.config.exclude ?? []).map((pattern) => this.replaceDisclaimer(pattern));

    exclude.push(
      "**/node_modules/**",
    );

    const files = await glob(include, {
      cwd: this.workspace.cwd,
      ignore: exclude,
      onlyFiles: true,
      absolute: true,
      dot: true,
    });

    const hashes = await Promise.all(files.sort().map(async (file) => {
      return await this.checksum(file);
    }));

    return this.createHash(hashes);
  };
}

export type {
  FileCacheConfig,
};

export default FileCache;
