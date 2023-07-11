import { defineRoserepo, defineMonorepo, Runner } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  monorepo: defineMonorepo({
    runner: {
      test: Runner.many({
        parallel: true,
      }),
    },
  }),
});