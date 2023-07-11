import type { BaseExecutorConfig } from "./base";

import type { MultiExecutorConfig } from "./multi";
import MultiExecutor from "./multi";

import type { ScriptExecutorConfig } from "./script";
import ScriptExecutor from "./script";

import type { NodeExecutorConfig } from "./node";
import NodeExecutor from "./node";

import type { CommandExecutorConfig } from "./command";
import CommandExecutor from "./command";

class Executor {
  static multi = ( config: BaseExecutorConfig<MultiExecutorConfig> ) => {
    return new MultiExecutor( config );
  };

  static script = ( config: BaseExecutorConfig<ScriptExecutorConfig> ) => {
    return new ScriptExecutor( config );
  };

  static node = ( config: BaseExecutorConfig<NodeExecutorConfig> ) => {
    return new NodeExecutor( config );
  };

  static command = ( config: BaseExecutorConfig<CommandExecutorConfig> ) => {
    return new CommandExecutor( config );
  };
}

export default Executor;