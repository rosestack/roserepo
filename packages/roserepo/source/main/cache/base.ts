import Roserepo from "~/main";

import {deepMerge} from "~shared/utils";

import crypto from "crypto";
import path from "path";
import fs from "fs";

type BaseCacheConfig<CacheConfig> = CacheConfig;

class Queue {
  private queue: (() => Promise<void>)[] = [];

  private running = false;

  add = (fn: () => Promise<void>) => {
    this.queue.push(fn);

    if (!this.running) {
      this.running = true;
      this.run();
    }
  };

  private run = async () => {
    while (this.queue.length) {
      const fn = this.queue.shift()!;
      await fn();
    }

    this.running = false;
  };
}

abstract class BaseCache<CacheConfig> {
  prepared = false;

  config: BaseCacheConfig<CacheConfig>;

  roserepo: Roserepo;

  name: string;
  options: any;

  parentCache?: BaseCache<unknown>;

  static saveQueue = new Queue();

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

  initFrom = (cache: BaseCache<unknown>) => {
    this.parentCache = cache;
    this.init(cache.roserepo, cache.name, cache.options);
  };

  protected createHash = (...data: unknown[]) => {
    const hash = crypto.createHash("md5");
    return hash.update(data.join(";")).digest("hex");
  };

  protected loadHash = async () => {
    const cacheFile = this.roserepo.resolve(".roserepo/cache.json");

    if (fs.existsSync(cacheFile)) {
      const cacheJson = JSON.parse((await fs.promises.readFile(cacheFile, "utf-8")));

      if (cacheJson[this.roserepo.cwd]?.[this.constructor.name]?.[this.name]) {
        return cacheJson[this.roserepo.cwd][this.constructor.name][this.name] as string;
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
      [this.roserepo.cwd]: {
        [this.constructor.name]: {
          [this.name]: hash,
        },
      },
    };

    let cacheJson = {};

    if (fs.existsSync(cacheFile)) {
      cacheJson = JSON.parse((await fs.promises.readFile(cacheFile, "utf-8")));
    }

    cacheJson = deepMerge(cacheJson, cache);

    return fs.promises.writeFile(cacheFile, JSON.stringify(cacheJson, null, 2));
  };

  compare = async () => {
    const oldHash = await this.loadHash();
    const newHash = await this.hash();
    return oldHash === newHash;
  };

  abstract hash(): (Promise<string> | string);
}

export type {
  BaseCacheConfig,
};

export default BaseCache;