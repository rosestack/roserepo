import ansis, {Ansis} from "ansis";

const colors = {
  roserepo: ansis.hex("#555657"),
  uniques: [
    ansis.hex("#ff80bf"),
    ansis.hex("#ff80ff"),
    ansis.hex("#bf80ff"),
    ansis.hex("#8080ff"),
    ansis.hex("#80bfff"),
    ansis.hex("#80ffff"),
    ansis.hex("#80ffbf"),
    ansis.hex("#80ff80"),
    ansis.hex("#bfff80"),
    ansis.hex("#ffff80"),
    ansis.hex("#ffbf80"),
    ansis.hex("#ff8080"),
    ansis.hex("#f35353"),
    ansis.hex("#ef9941"),
  ],
  //
  info: ansis.hex("#21be22"),
  warn: ansis.hex("#c1c41f"),
  debug: ansis.hex("#6532f3"),
  error: ansis.hex("#df1c00"),
};

interface LoggerConfig {
  name: string;
  color: Ansis;
  prefix?: string;
}

class Logger {
  config: LoggerConfig;

  static colorIndex = 0;

  static uniqueColor() {
    const color = colors.uniques[this.colorIndex];

    this.colorIndex = (this.colorIndex + 1) % colors.uniques.length;

    return color!;
  }

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  prefix() {
    const name = this.config.color(this.config.name);

    if (this.config.prefix) {
      return `${colors.roserepo(this.config.prefix)} ${name}`;
    }

    return name;
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

  logout(message: string) {
    console.info(this.prefix(), ":", message);
    return this;
  }

  logerr(message: string) {
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
      message = error.stack ?? error.message;
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
  color: colors.roserepo,
});

export type {
  LoggerConfig,
};

export {
  logger,
};

export default Logger;
