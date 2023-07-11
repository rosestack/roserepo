import { defineRoserepo, defineMonorepo, Runner } from "roserepo-dev";

export default defineRoserepo({
  root: true,
  monorepo: defineMonorepo({
    runner: {
      test: Runner.pipeline({
        selfScript: "echo",
      }),
      echo: Runner.pipeline({
        dependencyScript: "echo",
        roserepoScript: {
          type: "workspace",
          match: "directory",
          pattern: /utils/,
        },
      }),
    },
  }),
});