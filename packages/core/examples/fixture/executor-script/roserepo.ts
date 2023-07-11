import { defineRoserepo, defineWorkspace, Executor } from "roserepo-dev";

export default defineRoserepo({
  workspace: defineWorkspace({
    executor: {
      test: Executor.script({
        script: "echo",
      }),
    },
  }),
});