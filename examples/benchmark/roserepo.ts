import {defineRoserepo, Runner, Cache} from "roserepo";

export default defineRoserepo({
  runner: {
    build: Runner.pipeline({
      dependencyScript: "build",
      cache: Cache.file({
        include: [
          "source/**",
          "package.json",
          "tsconfig.json",
        ],
      }),
    }),
  },
});
