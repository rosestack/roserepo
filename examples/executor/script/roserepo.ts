import {defineRoserepo, Runner, Executor} from "roserepo";

export default defineRoserepo({
  runner: {
    start: Runner.many({
      executor: Executor.script({
        script: "build",
      }),
    }),
  },
});
