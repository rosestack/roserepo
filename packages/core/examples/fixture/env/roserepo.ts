import { defineRoserepo, defineMonorepo, Runner } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  env: {
    "ROSEREPO_ROSEREPO": true,
  },
  monorepo: defineMonorepo({
    runner: {
      test: Runner.multi({
        env: {
          "ROSEREPO_RUNNER_MULTI": true,
        },
        runners: [
          Runner.many({
            env: {
              "ROSEREPO_RUNNER_MANY": true,
            },
          }),
          Runner.pipeline({
            env: {
              "ROSEREPO_RUNNER_PIPELINE": true,
            },
          }),
        ],
      }),
    },
  }),
});