import BaseExecutor, {BaseExecutorConfig} from "./base";

import ScriptExecutor, {ScriptExecutorConfig} from "./script";
import CommandExecutor, {CommandExecutorConfig} from "./command";
import NodeExecutor, {NodeExecutorConfig} from "./node";

const Executor = {
  script: (config: BaseExecutorConfig<ScriptExecutorConfig>) => new ScriptExecutor(config),
  command: (config: BaseExecutorConfig<CommandExecutorConfig>) => new CommandExecutor(config),
  node: (config: BaseExecutorConfig<NodeExecutorConfig>) => new NodeExecutor(config),
};

export type {
  BaseExecutorConfig,
  ScriptExecutorConfig,
  CommandExecutorConfig,
  NodeExecutorConfig,
};

export {
  BaseExecutor,
  ScriptExecutor,
  CommandExecutor,
  NodeExecutor,
};

export {
  Executor,
};
