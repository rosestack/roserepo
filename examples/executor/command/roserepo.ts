import {defineRoserepo, Runner, Executor} from "roserepo";

export default defineRoserepo({
  runner: {
    start: Runner.many({
      executor: Executor.command({
        command: "echo",
        args: ["Hello, world!"],
      }),
    }),
  },
});
