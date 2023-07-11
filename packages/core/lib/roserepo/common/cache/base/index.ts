import type Roserepo from "~/roserepo";

import { deepMerge } from "~shared/utils";

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

type BaseCacheConfig<CacheConfig> = CacheConfig;

abstract class BaseCache<CacheConfig> {
  prepared = false;

  protected config: BaseCacheConfig<CacheConfig>;

  roserepo: Roserepo;

  name: string;
  options: any;

  parentCache?: BaseCache<unknown>;

  constructor(config: BaseCacheConfig<CacheConfig>) {
    this.config = config;
  }

  clone = () => {
    return new (this.constructor as new (config: CacheConfig) => BaseCache<CacheConfig>)(this.config);
  };

  init(roserepo: Roserepo, name: string, options: string[]) {
    this.prepared = true;
    this.roserepo = roserepo;
    this.name = name;
    this.options = options;
  }

  prepareFrom = (cache: BaseCache<unknown>) => {
    this.parentCache = cache;
    this.init(cache.roserepo, cache.name, cache.options);
  };

  protected createHash = (...data: unknown[]) => {
    const hash = crypto.createHash("md5");

    return hash.update(data.join(";")).digest("hex");
  };

  protected localHash = async () => {
    const cacheFile = this.roserepo.resolve(".roserepo/cache.json");

    if ( fs.existsSync(cacheFile) ) {
      const cacheJson = JSON.parse((await fs.promises.readFile(cacheFile, "utf-8")));

      if ( cacheJson[this.constructor.name]?.[this.name] ) {
        return cacheJson[this.constructor.name][this.name] as string;
      }
    }

    return null;
  };

  saveHash = async () => {
    const hash = await this.hash();

    const cacheFile = this.roserepo.resolve(".roserepo/cache.json");

    await fs.promises.mkdir(path.dirname(cacheFile), {
      recursive: true,
    });

    const cache = {
      [this.constructor.name]: {
        [this.name]: hash,
      },
    };

    let cacheJson = {};

    if ( fs.existsSync(cacheFile) ) {
      cacheJson = JSON.parse((await fs.promises.readFile(cacheFile, "utf-8")));
    }

    cacheJson = deepMerge(cacheJson, cache);

    return fs.promises.writeFile(cacheFile, JSON.stringify(cacheJson, null, 2));
  };

  compare = async () => {
    const oldHash = await this.localHash();
    const newHash = await this.hash();

    return oldHash === newHash;
  };

  abstract hash(): (Promise<string> | string);
}

export type {
  BaseCacheConfig,
};

export default BaseCache;