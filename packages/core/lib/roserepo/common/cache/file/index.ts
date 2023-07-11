import glob from "fast-glob";

import type Roserepo from "~/roserepo";

import BaseCache from "~roserepo/common/cache/base";

import RoserepoError from "~shared/error";

import { normalizePath } from "~shared/utils";

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
        regex: new RegExp(/\{root}/, "gi"),
        value: roserepo.root.cwd,
      }, {
        regex: new RegExp(/\{workspace}/, "gi"),
        value: roserepo.cwd,
      },
    ];
  }

  replaceDisclaimer = (pattern: string) => {
    if ( !this.disclaimer.test(pattern) ) {
      return pattern;
    }

    for ( const disclaimer of this.disclaimers ) {
      if ( disclaimer.regex.test(pattern) ) {
        pattern = pattern.replaceAll(disclaimer.regex, disclaimer.value);
      }
    }

    if ( this.disclaimer.test(pattern) ) {
      throw new RoserepoError(`Unknown disclaimer in ${ pattern }`);
    }

    return pattern;
  };

  resolveInclude = () => {
    return (this.config.include ?? []).map((pattern) => {
      pattern = this.replaceDisclaimer(pattern);

      if ( !path.isAbsolute(pattern) ) {
        pattern = this.roserepo.resolve(pattern);
      }

      return normalizePath(pattern);
    });
  };

  hash = async () => {
    const include = this.resolveInclude();

    const files = glob.sync(include, {
      onlyFiles: true,
      ignore: this.config.exclude,
      followSymbolicLinks: false,
      dot: false,
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