import {defineRoserepo, Runner, Executor} from "roserepo";

export default defineRoserepo({
  runner: {
    build: Runner.many({
      executor: Executor.node({
        file: "index.js",
      }),
    }),
  },
});
