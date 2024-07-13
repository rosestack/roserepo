import msgpack from "@ygoe/msgpack";

import {Workspace} from "~/domain/workspace";

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

interface SharedCacheConfig {
}

type BaseCacheConfig<CacheConfig> = SharedCacheConfig & CacheConfig;

abstract class BaseCache<CacheConfig> {
  config: BaseCacheConfig<CacheConfig>;

  workspace: Workspace;

  name: string;

  private get cacheFile() {
    return this.workspace.rootResolve(".roserepo/cache");
  }

  constructor(config: BaseCacheConfig<CacheConfig>) {
    this.config = config;
  }

  //

  clone = () => {
    return new (this.constructor as new (config: BaseCacheConfig<CacheConfig>) => BaseCache<CacheConfig>)(this.config);
  };

  //

  init(workspace: Workspace, name: string) {
    this.workspace = workspace;
    this.name = name;
  }

  //

  protected createHash = (...data: unknown[]) => {
    const hash = crypto.createHash("md5");
    return hash.update(data.join(";")).digest("hex");
  };

  load = async () => {
    if (fs.existsSync(this.cacheFile)) {
      const content = await fs.promises.readFile(this.cacheFile);
      return msgpack.decode(content);
    }

    return {};
  };

  save = async () => {
    const hash = await this.hash();

    await fs.promises.mkdir(path.dirname(this.cacheFile), {
      recursive: true,
    });

    let cacheJson = await this.load();

    const workspaceCache = cacheJson[this.workspace.name] ?? {};

    cacheJson = {
      ...cacheJson,
      [this.workspace.name]: {
        ...workspaceCache,
        [this.constructor.name]: {
          ...(workspaceCache[this.constructor.name] ?? {}),
          [this.name]: hash,
        },
      },
    };

    await fs.promises.writeFile(this.cacheFile, msgpack.encode(cacheJson));
  };

  compare = async () => {
    const cacheJson = await this.load();

    const savedHash = cacheJson[this.workspace.name]?.[this.constructor.name]?.[this.name];

    const currentHash = await this.hash();

    return currentHash === savedHash;
  };

  //

  abstract hash(): (Promise<string> | string);
}

export type {
  BaseCacheConfig,
};

export default BaseCache;
