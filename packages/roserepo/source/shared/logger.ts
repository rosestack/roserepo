import chalk, {ChalkInstance} from "chalk";
import Roserepo from "~/main";

const colors = {
  roserepo: chalk.hex("#555657"),
  uniques: [
    chalk.hex("#ff80bf"),
    chalk.hex("#ff80ff"),
    chalk.hex("#bf80ff"),
    chalk.hex("#8080ff"),
    chalk.hex("#80bfff"),
    chalk.hex("#80ffff"),
    chalk.hex("#80ffbf"),
    chalk.hex("#80ff80"),
    chalk.hex("#bfff80"),
    chalk.hex("#ffff80"),
    chalk.hex("#ffbf80"),
    chalk.hex("#ff8080"),
  ],
  //
  info: chalk.hex("#21be22"),
  warn: chalk.hex("#c1c41f"),
  debug: chalk.hex("#6532f3"),
  error: chalk.hex("#df1c00"),
};

const symbols = {
  roserepo: "✿",
  monorepo: "✸",
  microrepo: "★",
  workspace: "✦",
};

interface LoggerConfig {
  name: string;
  symbol: string;
  color: ChalkInstance;
}

class Logger {
  config: LoggerConfig;

  static colorIndex = 0;

  static uniqueColor(): ChalkInstance {
    const color = colors.uniques[this.colorIndex];

    this.colorIndex = (this.colorIndex + 1) % colors.uniques.length;

    return color!;
  }

  static resolveSymbol = (roserepo: Roserepo) => {
    if (roserepo.isMonorepo) {
      return symbols.monorepo;
    }

    if (roserepo.isMicrorepo) {
      return symbols.microrepo;
    }

    return symbols.workspace;
  };

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  prefix() {
    return `${this.config.symbol} ${this.config.color(this.config.name)}`;
  }

  //

  debug = (...messages: any[]) => {
    if (!process.env.DEBUG) {
      return;
    }

    console.debug(this.prefix(), `[${colors.debug("debug")}] :`, ...messages);
    return this;
  };

  //

  logout(message: any[]) {
    console.info(this.prefix(), ":", message);
    return this;
  }

  logerr(message: any[]) {
    console.error(this.prefix(), ":", colors.error(message));
    return this;
  }

  //

  info = (...messages: any[]) => {
    console.info(this.prefix(), `[${colors.info("info")}] :`, ...messages);
    return this;
  };

  warn = (...messages: any[]) => {
    console.warn(this.prefix(), `[${colors.warn("warn")}] :`, ...messages);
    return this;
  };

  error = (error: unknown) => {
    let message = error;

    if (error instanceof Error) {
      message = error.message;
    }

    console.error(this.prefix(), `[${colors.error("error")}] :`, message);
    return this;
  };

  //

  line() {
    console.log();
    return this;
  }

  mark(...messages: any) {
    return this.config.color(messages.join(" "));
  }

  timer() {
    const start = Date.now();

    return {
      end: () => {
        return Date.now() - start;
      },
    };
  }

  //

  format(...messages: string[]) {
    return `${this.config.color(this.config.name)} : ${messages.join(" ")}`;
  }
}

const logger = new Logger({
  name: "Roserepo",
  symbol: symbols.roserepo,
  color: colors.roserepo,
});

export type {
  LoggerConfig,
};

export {
  logger,
};

export default Logger;