import ScriptExecutor, {ScriptExecutorConfig} from "./script";
import NodeExecutor, {NodeExecutorConfig} from "./node";
import CommandExecutor, {CommandExecutorConfig} from "./command";
import MultiExecutor, {MultiExecutorConfig} from "./multi";

import {BaseExecutorConfig} from "./base";

const Executor = {
  script: (config: BaseExecutorConfig<ScriptExecutorConfig>) => {
    return new ScriptExecutor(config);
  },
  node: (config: BaseExecutorConfig<NodeExecutorConfig>) => {
    return new NodeExecutor(config);
  },
  command: (config: BaseExecutorConfig<CommandExecutorConfig>) => {
    return new CommandExecutor(config);
  },
  multi: (config: BaseExecutorConfig<MultiExecutorConfig>) => {
    return new MultiExecutor(config);
  },
};

export default Executor;