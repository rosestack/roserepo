import chalk from "chalk";

const colors = {
  info: chalk.hex( "#21be22" ),
  warn: chalk.hex( "#c1c41f" ),
  error: chalk.hex( "#df1c00" ),
  debug: chalk.hex( "#6532f3" ),
  //
  roserepo: chalk.hex( "#555657" ),
  workspaces: [
    chalk.hex( "#ff80bf" ),
    chalk.hex( "#ff80ff" ),
    chalk.hex( "#bf80ff" ),
    chalk.hex( "#8080ff" ),
    chalk.hex( "#80bfff" ),
    chalk.hex( "#80ffff" ),
    chalk.hex( "#80ffbf" ),
    chalk.hex( "#80ff80" ),
    chalk.hex( "#bfff80" ),
    chalk.hex( "#ffff80" ),
    chalk.hex( "#ffbf80" ),
    chalk.hex( "#ff8080" ),
  ],
  //
  mark: chalk.bgHex( "#212121" ).hex( "#dadada" ),
};

const symbols = {
  info: "•",
  success: "✔",
  warn: "⚠",
  error: "✖",
  //
  roserepo: "❁",
  workspaces: [
    " ★",
    " ♦",
    " ♠",
    " ♣",
  ],
};

export {
  colors,
  symbols,
};