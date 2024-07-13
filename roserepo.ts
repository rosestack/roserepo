import {defineRoserepo, Runner, Cache} from "roserepo";

export default defineRoserepo({
  runner: {
    watch: Runner.many({
      parallel: true,
    }),
    build: Runner.pipeline({
      dependencyScript: "build",
      cache: Cache.file({
        include: [
          "**/source/**",
          "package.json",
          "tsconfig.json",
        ],
      }),
    }),
  },
});
