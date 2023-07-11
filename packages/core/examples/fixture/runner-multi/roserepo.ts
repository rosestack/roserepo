import { defineRoserepo, defineMonorepo, Runner } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  monorepo: defineMonorepo({
    runner: {
      test: Runner.multi({
        runners: [
          Runner.many({
            parallel: true,
          }),
          Runner.many({
            parallel: false,
          }),
        ],
      }),
    },
  }),
});