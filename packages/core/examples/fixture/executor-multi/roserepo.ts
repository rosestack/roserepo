import { defineRoserepo, defineWorkspace, Executor } from "roserepo-dev";

export default defineRoserepo({
  workspace: defineWorkspace({
    executor: {
      test: Executor.multi({
        executors: [
          Executor.script({
            script: "echo",
          }),
          Executor.command({
            command: "npm",
            args: [ "run", "echo" ],
          }),
        ],
      }),
    },
  }),
});