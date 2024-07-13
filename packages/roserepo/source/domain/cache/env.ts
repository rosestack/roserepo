import BaseCache from "./base";

type VariableType = string | string[];

interface EnvCacheConfig {
  variable: VariableType | (() => VariableType | Promise<VariableType>);
}

class EnvCache extends BaseCache<EnvCacheConfig> {
  hash = async () => {
    let variable = this.config.variable;

    if (typeof variable === "function") {
      variable = await variable();
    }

    const variables = (Array.isArray(variable) ? variable : [variable]).filter((variable) => {
      return Reflect.has(process.env, variable);
    });

    return JSON.stringify(variables.map((variable) => {
      return process.env[variable];
    }));
  };
}

export type {
  EnvCacheConfig,
};

export default EnvCache;
