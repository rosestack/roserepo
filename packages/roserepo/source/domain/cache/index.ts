import BaseCache, {BaseCacheConfig} from "./base";

import EnvCache, {EnvCacheConfig} from "./env";
import FileCache, {FileCacheConfig} from "./file";
import FlagCache, {FlagCacheConfig} from "./flag";
import MultiCache, {MultiCacheConfig} from "./multi";

const Cache = {
  env: (config: BaseCacheConfig<EnvCacheConfig>) => new EnvCache(config),
  file: (config: BaseCacheConfig<FileCacheConfig>) => new FileCache(config),
  flag: (config: BaseCacheConfig<FlagCacheConfig>) => new FlagCache(config),
  multi: (config: BaseCacheConfig<MultiCacheConfig>) => new MultiCache(config),
};

export type {
  BaseCacheConfig,
  EnvCacheConfig,
  FileCacheConfig,
  FlagCacheConfig,
  MultiCacheConfig,
};

export {
  BaseCache,
  EnvCache,
  FileCache,
  FlagCache,
  MultiCache,
};

export {
  Cache,
};
