import {defineRoserepo} from "roserepo";

export default defineRoserepo({
  root: true,
  upgrader: {
    excludeDependencies: [
      "chalk",
    ],
  },
});