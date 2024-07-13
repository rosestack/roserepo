import BaseCache from "./base";

import {Workspace} from "~/domain/workspace";

interface MultiCacheConfig {
  caches: BaseCache<unknown>[];
}

class MultiCache extends BaseCache<MultiCacheConfig> {
  init = (workspace: Workspace, name: string) => {
    super.init(workspace, name);

    this.config.caches.forEach((cache) => {
      cache.init(workspace, name);
    });
  };

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
