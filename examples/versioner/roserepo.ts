import {Cache, defineRoserepo, Runner} from "roserepo";

export default defineRoserepo({
  root: true,
  runner: {
    build: Runner.pipeline({
      parallel: true,
      dependencyScript: "build",
      cache: Cache.file({
        include: [
          "package.json",
          "tsconfig.json",
          "source/**",
        ],
      }),
    }),
    start: Runner.pipeline({
      parallel: true,
      dependencyScript: "build",
      selfScript: "build",
    }),
  },
});