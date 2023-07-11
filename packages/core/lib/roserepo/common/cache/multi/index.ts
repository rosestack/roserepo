import type Roserepo from "~/roserepo";

import BaseCache from "~roserepo/common/cache/base";

interface MultiCacheConfig {
  caches: BaseCache<unknown>[];
}

class MultiCache extends BaseCache<MultiCacheConfig> {
  override init(roserepo: Roserepo, script: string, options: any) {
    super.init(roserepo, script, options);

    this.config.caches.forEach((cache) => {
      if ( !cache.prepared ) {
        cache.prepareFrom(this);
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