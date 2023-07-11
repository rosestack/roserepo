import { defineRoserepo } from "roserepo-dev";

import * as fs from "fs";
import * as path from "path";

export default defineRoserepo({
  workspace: {
    publish: {
      beforePublish: (roserepo) => {
        const packageJson = path.join(roserepo.cwd, "package.json");
        const packageJsonContent = fs.readFileSync(packageJson, "utf-8");
        const packageJsonObj = JSON.parse(packageJsonContent);

        packageJsonObj.name = "pk2";

        fs.writeFileSync(packageJson, JSON.stringify(packageJsonObj, null, 2));
      },
      afterPublish: (roserepo) => {
        const packageJson = path.join(roserepo.cwd, "package.json");
        const packageJsonContent = fs.readFileSync(packageJson, "utf-8");
        const packageJsonObj = JSON.parse(packageJsonContent);

        packageJsonObj.name = "pk1";

        fs.writeFileSync(packageJson, JSON.stringify(packageJsonObj, null, 2));
      },
    },
  },
});