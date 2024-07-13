import {Module} from "~/domain/module";
import {Workspace} from "~/domain/workspace";

const packageManagers = [
  {
    name: "npm",
    lockfile: "package-lock.json",
  },
  {
    name: "yarn",
    lockfile: "yarn.lock",
  },
  {
    name: "pnpm",
    lockfile: "pnpm-lock.yaml",
  },
];

interface PackageManagerResult {
  command: string;
  args: string[];
}

abstract class PackageManager {
  module: Module;

  abstract name: string;

  constructor(module: Module) {
    this.module = module;
  }

  install(): PackageManagerResult {
    return {
      command: this.name,
      args: ["install"],
    };
  }

  run(script: string): PackageManagerResult {
    return {
      command: this.name,
      args: ["run", script],
    };
  }

  abstract publish(options: { tag?: string; access?: string; dryRun?: boolean; }): PackageManagerResult;
}

class NpmPackageManager extends PackageManager {
  name = "npm";

  publish({tag, access, dryRun}: { tag?: string; access?: string; dryRun?: boolean; }): PackageManagerResult {
    const args = ["publish"];

    if (tag) {
      args.push("--tag", tag);
    }

    if (access) {
      args.push("--access", access);
    }

    if (dryRun) {
      args.push("--dry-run");
    }

    return {
      command: this.name,
      args,
    };
  }
}

class YarnPackageManager extends PackageManager {
  name = "yarn";

  publish({tag, access, dryRun}: { tag?: string; access?: string; dryRun?: boolean; }): PackageManagerResult {
    const args = ["publish"];

    if (tag) {
      args.push("--tag", tag);
    }

    if (access) {
      args.push("--access", access);
    }

    if (dryRun) {
      args.push("--dry-run");
    }

    return {
      command: this.name,
      args,
    };
  }
}

class PnpmPackageManager extends PackageManager {
  name = "pnpm";

  publish({tag, access, dryRun}: { tag?: string; access?: string; dryRun?: boolean; }): PackageManagerResult {
    const args = ["publish"];

    if (tag) {
      args.push("--tag", tag);
    }

    if (access) {
      args.push("--access", access);
    }

    if (dryRun) {
      args.push("--dry-run");
    }

    return {
      command: this.name,
      args,
    };
  }
}

const createPackageManager = (module: Module) => {
  let packageManager: string;

  if (module.packageJson.packageManager) {
    packageManager = module.packageJson.packageManager.split("@").at(0);
  } else {
    for (const {name, lockfile} of packageManagers) {
      if (module.io.hasFile(lockfile)) {
        packageManager = name;
        break;
      }
    }

    if (!packageManager) {
      if (module instanceof Workspace && module.roserepo) {
        return createPackageManager(module.roserepo);
      }

      packageManager = "npm";
    }
  }

  switch (packageManager) {
    case "npm":
      return new NpmPackageManager(module);
    case "yarn":
      return new YarnPackageManager(module);
    case "pnpm":
      return new PnpmPackageManager(module);
  }

  throw new Error(`Unknown package manager: ${packageManager}`);
};

export {
  PackageManager,
};

export {
  createPackageManager,
};
