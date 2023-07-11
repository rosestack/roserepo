import type { CompilerOptions } from "typescript";

interface RoserepoFilter {
  type: "all" | "monorepo" | "workspace";
  match: "name" | "directory" | "location";
  pattern: string | RegExp;
}

interface PackageJson {
  name?: string;
  description?: string;
  version?: string;
  scripts?: Record<string, string>;
  //
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  //
  workspaces?: string[] | {
    packages?: string[];
  };
  private?: boolean;
}

interface TsConfig {
  compilerOptions?: CompilerOptions;
  include?: string[];
  exclude?: string[];
}

export type {
  RoserepoFilter,
  PackageJson,
  TsConfig,
};