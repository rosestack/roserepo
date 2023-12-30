import {Cache, defineRoserepo, Runner} from "roserepo";

export default defineRoserepo({
  root: true,
  runner: {
    lint: Runner.many({
      limit: 2,
      parallel: true,
      cache: Cache.file({
        include: [
          "package.json",
        ],
      }),
    }),
  },
});