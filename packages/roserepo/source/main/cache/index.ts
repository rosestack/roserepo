import FileCache, {FileCacheConfig} from "./file";
import MultiCache, {MultiCacheConfig} from "./multi";

import {BaseCacheConfig} from "./base";

const Cache = {
  file: (config: BaseCacheConfig<FileCacheConfig>) => {
    return new FileCache(config);
  },
  multi: (config: BaseCacheConfig<MultiCacheConfig>) => {
    return new MultiCache(config);
  }
};

export default Cache;