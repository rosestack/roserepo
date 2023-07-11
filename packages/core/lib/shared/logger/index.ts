import type { ChalkFunction } from "chalk";

import { colors, symbols } from "./helper";

import RoserepoError from "~shared/error";

import util from "util";

interface ErrorOptions {
  lineBefore?: boolean;
  lineAfter?: boolean;
  stack?: boolean;
  exit?: boolean;
}

interface Config {
  color: ChalkFunction;
  symbol: string;
  name: string;
}

class RoserepoLogger {
  config: Config;

  private colorIndex = 0;
  private symbolIndex = 0;

  constructor(config: Config) {
    this.config = config;
  }

  get uniqueColor(): ChalkFunction {
    const color = colors.workspaces[this.colorIndex];
    this.colorIndex = (this.colorIndex + 1) % colors.workspaces.length;

    return color as ChalkFunction;
  }

  get uniqueSymbol(): string {
    const symbol = symbols.workspaces[this.symbolIndex];
    this.symbolIndex = (this.symbolIndex + 1) % symbols.workspaces.length;

    return symbol as string;
  }

  get prefix() {
    return `${ this.config.symbol } ${ this.config.color(this.config.name) }`;
  }

  logout(message: any[]) {
    return console.info(this.prefix, ":", message);
  }

  logerr(message: any[]) {
    return console.error(this.prefix, ":", colors.error(message));
  }

  //

  format(...messages: string[]) {
    return `${ this.config.color(this.config.name) } : ${ messages.join(" ") }`;
  }

  //

  log = (...messages: any[]) => {
    console.info(this.prefix, ":", ...messages);

    return this;
  };

  info = (...messages: any[]) => {
    console.info(this.prefix, `[${ colors.info("info") }] :`, ...messages);

    return this;
  };

  warn(...messages: any[]) {
    console.warn(this.prefix, `[${ colors.warn("warn") }] :`, ...messages);

    return this;
  }

  debug = (...messages: any[]) => {
    if ( !process.env.DEBUG ) {
      return this;
    }

    console.debug(this.prefix, `[${ colors.debug("debug") }] :`, colors.debug(...messages));

    return this;
  };

  error(error: unknown, options?: ErrorOptions) {
    let message: string;

    if ( error instanceof Error ) {
      let roserepoError: RoserepoError;

      if ( error instanceof RoserepoError ) {
        roserepoError = error;
      } else {
        roserepoError = RoserepoError.from(error);
      }

      message = roserepoError.formatted(options?.stack);
    } else if ( typeof error === "string" ) {
      message = error;
    } else {
      message = util.inspect(error, {
        colors: true,
        depth: 5,
      });
    }

    if ( options?.lineBefore ) {
      this.line();
    }

    console.error(this.prefix, `[${ colors.error("error") }] :`, message);

    if ( options?.lineAfter ) {
      this.line();
    }

    if ( options?.exit ) {
      process.exit(1);
    }
  }

  line() {
    console.log();
    return this;
  }

  mark(...messages: any) {
    return messages.map((message: any) => {
      return colors.mark(` ${ message } `);
    }).join(" ");
  }

  startTimer() {
    return Date.now();
  }

  endTimer(time: number) {
    return Date.now() - time;
  }
}

const logger = new RoserepoLogger({
  name: "Roserepo",
  symbol: symbols.roserepo,
  color: colors.roserepo,
});

export {
  logger,
  //
  colors,
  symbols,
};

export default RoserepoLogger;