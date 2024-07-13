import {defineWorkspace} from "roserepo";

export default defineWorkspace({
  dotenv: true,
  env: {
    ROSEREPO_WORKSPACE_CONFIG_FILE: true,
  },
});
