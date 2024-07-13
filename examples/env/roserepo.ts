import {defineRoserepo, Runner, Executor} from "roserepo";

export default defineRoserepo({
  dotenv: true,
  env: {
    ROSEREPO_GLOBAL: true,
  },
  runner: {
    start: Runner.many({
      env: {
        ROSEREPO_CONFIG_FILE: true,
      },
      executor: Executor.command({
        command: "node",
        args: ["./index.js"],
        env: {
          ROSEREPO_EXECUTOR: true,
        },
      }),
    }),
  },
});
