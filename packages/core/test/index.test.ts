import { beforeAll, describe, expect, test } from "vitest";

import { execa } from "execa";

import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "examples", "fixture");
const projects = fs.readdirSync(dir);

console.log("Projects:", projects);

beforeAll(async () => {
  for ( const project of projects ) {
    const projectPath = path.join(dir, project);

    const roserepoCachePath = path.join(projectPath, ".roserepo");

    if ( fs.existsSync(roserepoCachePath) ) {
      console.log("Removing cache files...");
      await fs.promises.rmdir(roserepoCachePath);
    }
  }
});

const runs = projects.map((project) => {
  return {
    name: project,
    path: path.join(dir, project),
  };
});

describe("Roserepo", () => {
  for ( const run of runs ) {
    test(run.name, async () => {
      const result = await execa("npm", [ "run", "test" ], {
        cwd: run.path,
      });

      expect(result.exitCode).toBe(0);
    }, 10000);
  }
});