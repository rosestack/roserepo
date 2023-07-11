import { defineRoserepo, defineWorkspace, Executor } from "roserepo-dev";

export default defineRoserepo({
  env: {
    "ROSEREPO_ROSEREPO1": true,
  },
  workspace: defineWorkspace({
    executor: {
      test: Executor.multi({
        env: {
          "ROSEREPO_EXECUTOR_MULTI": true,
        },
        executors: [
          Executor.script({
            env: {
              "ROSEREPO_EXECUTOR_SCRIPT": true,
            },
            script: "test",
          }),
          Executor.command({
            env: {
              "ROSEREPO_EXECUTOR_COMMAND": true,
            },
            command: "npm",
            args: [ "run", "test" ],
          }),
        ],
      }),
    },
  }),
});