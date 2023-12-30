import {normalize} from "rosetil";

import path from "path";
import fs from "fs";

const findChildren = (cwd: string, dirs: string[]) => {
  const children: string[] = [];

  if (dirs.length === 0) {
    return children;
  }

  dirs = dirs.filter((dir) => {
    if (dir === cwd) {
      return false;
    }

    return dir.startsWith(cwd);
  });

  for (const dir of dirs) {
    const packageJson = path.join(dir, "package.json");
    const roserepo = path.join(dir, "roserepo.ts");

    const exists = [
      fs.existsSync(packageJson),
      fs.existsSync(roserepo),
    ];

    if (!exists.includes(true)) {
      continue;
    }

    const parent = children.find((child) => {
      return dir.startsWith(child);
    });

    if (parent) {
      continue;
    }

    children.push(dir);
  }

  return children;
};

const pathMatch = (path1: string, path2: string) => {
  return normalize(path1) === normalize(path2);
};

const deepMerge = <T>(...values: T[]) => {
  return Array.from(values).reduce((previousValue: any, currentValue) => {
    if (previousValue && currentValue) {
      if (Array.isArray(previousValue) && Array.isArray(currentValue)) {
        return Array.from(new Set([
          ...previousValue,
          ...currentValue,
        ]));
      } else if ((typeof previousValue === "object") && (typeof currentValue === "object")) {
        Object.entries(currentValue).forEach(([key, value]) => {
          const pValue = Reflect.get(previousValue, key);
          Reflect.set(previousValue, key, deepMerge(pValue, value));
        });

        return previousValue;
      }
    }

    return currentValue;
  });
};

export {
  findChildren,
  pathMatch,
  deepMerge,
};