import {defineWorkspace, Cache} from "roserepo";

import crypto from "node:crypto";

export default defineWorkspace({
  executorConfig: {
    cache: Cache.flag({
      flag: () => {
        return crypto.randomBytes(16).toString("hex");
      },
    }),
  },
});
