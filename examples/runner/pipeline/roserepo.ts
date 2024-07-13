import {defineRoserepo, Runner} from "roserepo";

export default defineRoserepo({
  runner: {
    start: Runner.pipeline({
      parallel: true,
      dependencyScript: "build",
      selfScript: "build",
    }),
    build: Runner.pipeline({
      parallel: true,
      dependencyScript: "build",
      workspaceScript: {
        match: "name",
        pattern: "pkg2",
        script: "build",
      },
    }),
  },
});
