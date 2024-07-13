import {defineRoserepo, Runner} from "roserepo";

export default defineRoserepo({
  runner: {
    build: Runner.many({
      parallel: false,
    }),
  },
});
