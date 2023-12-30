import {defineRoserepo, Runner, Cache} from "roserepo";

export default defineRoserepo({
  root: true,
  runner: {
    watch: Runner.many({
      parallel: true,
      throwOnError: false,
    }),
    build: Runner.pipeline({
      parallel: true,
      throwOnError: true,
      dependencyScript: "build",
      cache: Cache.file({
        include: [
          "dist/**/*",
          "source/**/*",
          "package.json",
          "tsconfig.json",
        ],
      }),
    }),
    test: Runner.pipeline({
      parallel: false,
      throwOnError: true,
      selfScript: "build",
    }),
    lint: Runner.many({
      parallel: true,
      throwOnError: true,
    }),
  },
});