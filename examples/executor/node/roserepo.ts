import {defineRoserepo, Executor} from "roserepo";

export default defineRoserepo({
  root: true,
  executor: {
    start: Executor.node({
      file: "src/index.js",
    }),
  },
});