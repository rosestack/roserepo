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
        ],
      }),
    }),
  },
});