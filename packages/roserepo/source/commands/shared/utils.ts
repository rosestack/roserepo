import {findDir} from "rosetil";

import {loadPackage} from "roserc";

import {Module} from "~/domain/module";
import {Roserepo} from "~/domain/roserepo";
import {Workspace} from "~/domain/workspace";

const getModule = async (): Promise<Module> => {
  const cwd = await findDir({
    name: "package.json",
    cwd: process.cwd(),
    traversal: "up",
  });

  if (!cwd) {
    throw new Error("Could not find the current working directory");
  }

  const packageJson = await loadPackage(cwd);

  if (packageJson.workspaces) {
    return Roserepo.load(cwd, packageJson);
  }

  return Workspace.load(cwd, packageJson);
};

export {
  getModule,
};
