import BaseCache from "./base";

type FlagType = string | number | boolean;

interface FlagCacheConfig {
  flag: FlagType | (() => FlagType | Promise<FlagType>);
}

class FlagCache extends BaseCache<FlagCacheConfig> {
  hash = async () => {
    let flag = this.config.flag;

    if (typeof flag === "function") {
      flag = await flag();
    }

    return JSON.stringify(flag);
  };
}

export type {
  FlagCacheConfig,
};

export default FlagCache;
