import path from "path";
import fs from "fs";

const findRoot = (cwd: string): (string | null) => {
  const files = [ "package.json", "roserepo.ts" ];

  const isRoot = files.some(fs.existsSync);

  if ( isRoot ) {
    return normalizePath(cwd);
  }

  const dirname = path.dirname(cwd);

  if ( cwd === dirname ) {
    return null;
  }

  return findRoot(dirname);
};

const findChildren = (cwd: string, dirs: string[]): string[] => {
  const children: string[] = [];

  if ( dirs.length === 0 ) {
    return children;
  }

  dirs = dirs.filter((dir) => {
    if ( dir === cwd ) {
      return false;
    }

    return dir.startsWith(cwd);
  });

  for ( const dir of dirs ) {
    const packageJson = path.join(dir, "package.json");
    const roserepo = path.join(dir, "roserepo.ts");

    const exists = [
      fs.existsSync(packageJson),
      fs.existsSync(roserepo),
    ];

    if ( !exists.includes(true) ) {
      continue;
    }

    const parent = children.find((child) => {
      return dir.startsWith(child);
    });

    if ( parent ) {
      continue;
    }

    children.push(dir);
  }

  return children;
};

const normalizePath = (path: string) => {
  return path.replace(/\\/g, "/");
};

const pathMatch = (path1: string, path2: string) => {
  return normalizePath(path1) === normalizePath(path2);
};

const deepMerge = <T>(...values: T[]) => {
  return Array.from(values).reduce((previousValue: any, currentValue) => {
    if ( previousValue && currentValue ) {
      if ( Array.isArray(previousValue) && Array.isArray(currentValue) ) {
        return Array.from(new Set([
          ...previousValue,
          ...currentValue,
        ]));
      } else if ( (typeof previousValue === "object") && (typeof currentValue === "object") ) {
        Object.entries(currentValue).forEach(([ key, value ]) => {
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
  findRoot,
  findChildren,
  normalizePath,
  pathMatch,
  deepMerge,
};