import { defineRoserepo } from "roserepo-dev";

export default defineRoserepo({
  workspace: {
    upgrade: {
      respectPeerDependencies: true,
    },
  },
});