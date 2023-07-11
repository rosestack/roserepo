import type { BaseCacheConfig } from "./base";

import type { FileCacheConfig } from "./file";
import FileCache from "./file";
import type { MultiCacheConfig } from "./multi";
import MultiCache from "./multi";

class Cache {
  static file = ( config: BaseCacheConfig<FileCacheConfig> ) => {
    return new FileCache( config );
  };

  static multi = ( config: BaseCacheConfig<MultiCacheConfig> ) => {
    return new MultiCache( config );
  };
}

export default Cache;