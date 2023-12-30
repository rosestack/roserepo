import Roserepo from "~/main";

import BaseCache from "./base";

interface MultiCacheConfig {
  caches: BaseCache<unknown>[];
}

class MultiCache extends BaseCache<MultiCacheConfig> {
  override init(roserepo: Roserepo, script: string, options: any) {
    super.init(roserepo, script, options);

    this.config.caches.forEach((cache) => {
      if (!cache.prepared) {
        cache.initFrom(this);
      }
    });
  }

  async hash() {
    const results = await Promise.all(this.config.caches.map((cache) => {
      return cache.hash();
    }));

    return this.createHash(results);
  }
}

export type {
  MultiCacheConfig,
};

export default MultiCache;