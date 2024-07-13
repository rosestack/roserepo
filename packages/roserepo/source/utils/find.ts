import {PackageJson, loadPackage} from "roserc";

import {find, normalize} from "rosetil";

import glob from "fast-glob";

import path from "node:path";
import fs from "node:fs";

interface FindRoot {
  cwd: string;
  packageJson: PackageJson;
  workspaces: Map<string, PackageJson>;
}

const findRoot = async (cwd: string, workspaces = new Map<string, PackageJson>()): Promise<FindRoot | undefined> => {
  cwd = path.dirname(cwd);

  const packageJsonPath = await find({
    cwd,
    name: "package.json",
    traversal: "up",
  });

  if (!packageJsonPath) {
    return;
  }

  if (path.dirname(cwd) === cwd) {
    return;
  }

  const packageJson = await loadPackage(packageJsonPath);

  if (packageJson.workspaces !== undefined) {
    return {
      cwd,
      packageJson,
      workspaces,
    };
  }

  workspaces.set(cwd, packageJson);

  return findRoot(path.dirname(cwd), workspaces);
};

const findWorkspaces = async (cwd: string, packageJson: PackageJson) => {
  let pattern: string[];

  if (Array.isArray(packageJson.workspaces)) {
    pattern = packageJson.workspaces;
  } else {
    pattern = packageJson.workspaces.packages;
  }

  const workspaces = await glob(pattern, {
    cwd,
    unique: true,
    absolute: true,
    onlyDirectories: true,
    followSymbolicLinks: false,
    ignore: [
      "**/node_modules/**",
    ],
  });

  return workspaces.map(normalize).filter((workspace) => {
    if (workspace === cwd) {
      return false;
    }

    return fs.existsSync(path.join(workspace, "package.json"));
  });
};

export {
  findRoot,
  findWorkspaces,
};
