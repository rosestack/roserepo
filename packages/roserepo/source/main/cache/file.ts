import glob from "fast-glob";

import {normalize} from "rosetil";

import Roserepo from "~/main";

import BaseCache from "./base";

import path from "path";
import fs from "fs";

interface Disclaimer {
  regex: RegExp;
  value: string;
}

interface FileCacheConfig {
  include?: string[];
  exclude?: string[];
}

class FileCache extends BaseCache<FileCacheConfig> {
  private disclaimer = /\{.*}/;

  private disclaimers: Disclaimer[];

  override init(roserepo: Roserepo, script: string, options: string[]) {
    super.init(roserepo, script, options);

    this.disclaimers = [
      {
        regex: new RegExp(/\{monorepoDir}/, "gi"),
        value: roserepo.root.cwd,
      }, {
        regex: new RegExp(/\{workspaceDir}/, "gi"),
        value: roserepo.cwd,
      },
    ];
  }

  replaceDisclaimer = (pattern: string) => {
    if (!this.disclaimer.test(pattern)) {
      return pattern;
    }

    for (const disclaimer of this.disclaimers) {
      if (disclaimer.regex.test(pattern)) {
        pattern = pattern.replaceAll(disclaimer.regex, disclaimer.value);
      }
    }

    if (this.disclaimer.test(pattern)) {
      throw new Error(`Unknown disclaimer in ${pattern}`);
    }

    return pattern;
  };

  resolveInclude = () => {
    return (this.config.include ?? []).map((pattern) => {
      pattern = this.replaceDisclaimer(pattern);

      if (!path.isAbsolute(pattern)) {
        pattern = this.roserepo.resolve(pattern);
      }

      return normalize(pattern);
    });
  };

  hash = async () => {
    const include = this.resolveInclude();

    const files = glob.sync(include, {
      onlyFiles: true,
      ignore: this.config.exclude,
      followSymbolicLinks: false,
    });

    const data = await Promise.all(files.map((file) => {
      return fs.promises.readFile(file, "utf8");
    }));

    return this.createHash(data);
  };
}

export type {
  FileCacheConfig,
};

export default FileCache;