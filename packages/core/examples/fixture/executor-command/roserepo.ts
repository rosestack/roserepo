import { defineRoserepo, defineWorkspace, Executor } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  workspace: defineWorkspace({
    executor: {
      test: Executor.command({
        command: "npm",
        args: [
          "run",
          "echo",
        ],
      }),
    },
  }),
});