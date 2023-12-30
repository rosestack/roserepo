import {defineRoserepo, Runner} from "roserepo";

export default defineRoserepo({
  root: true,
  runner: {
    start: Runner.many({
    }),
  },
});