import { defineRoserepo, Runner, Cache } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  monorepo: {
    runner: {
      test: Runner.many({
        parallel: true,
        cache: Cache.file({
          include: ["package.json"],
        }),
      }),
    },
  },
});