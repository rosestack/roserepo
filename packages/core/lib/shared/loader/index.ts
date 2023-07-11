import { bundleRequire } from "bundle-require";

import type { Config } from "~/roserepo";

import RoserepoError from "~shared/error";

import type { PackageJson, TsConfig } from "~/types";

import path from "path";
import fs from "fs";

const loadConfig = async (cwd: string): Promise<Config> => {
  const filepath = path.resolve(cwd, "roserepo.ts");

  if ( !fs.existsSync(filepath) ) {
    return {};
  }

  try {
    const { mod } = await bundleRequire({
      filepath,
    });

    const config = mod.roserepo || mod.default;

    if ( config ) {
      return config;
    }

    throw new RoserepoError(`No default export found in ${ path.basename(filepath) }, located at ${ path.dirname(filepath) }`);
  } catch ( error ) {
    throw RoserepoError.from(error);
  }
};

const loadPackageJson = (cwd: string): (PackageJson | undefined) => {
  const filepath = path.join(cwd, "package.json");

  if ( !fs.existsSync(filepath) ) {
    return;
  }

  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch ( error ) {
    throw RoserepoError.from(error);
  }
};

let ts: any;

const loadTsConfig = async (cwd: string): Promise<TsConfig | undefined> => {
  const filepath = path.join(cwd, "tsconfig.json");

  if ( !fs.existsSync(filepath) ) {
    return;
  }

  try {
    if ( !ts ) {
      ts = await import( "typescript" ).then((mod) => {
        return mod.default || mod;
      }).catch((error) => {
        throw new RoserepoError("Failed to load typescript module, are you sure it's installed?", {
          cause: error,
        });
      });
    }

    const { config, error } = ts.readConfigFile(filepath, ts.sys.readFile);

    if ( error ) {
      throw new RoserepoError(ts.formatDiagnostic(error, {
        getCanonicalFileName: (fileName: string) => {
          return fileName;
        },
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => {
          return ts.sys.newLine;
        },
      }));
    }

    const parsedTsFile = ts.parseJsonConfigFileContent(config, ts.sys, cwd);

    return {
      compilerOptions: parsedTsFile.options,
      include: parsedTsFile.raw.include || [],
      exclude: parsedTsFile.raw.exclude || [],
    };
  } catch ( error ) {
    throw RoserepoError.from(error);
  }
};

export {
  loadConfig,
  loadPackageJson,
  loadTsConfig,
};