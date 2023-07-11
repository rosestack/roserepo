#!/usr/bin/env node

import { Command } from "commander";

import changeset from "./commands/changeset";
import publish from "./commands/publish";
import upgrade from "./commands/upgrade";
import run from "./commands/run";
import ui from "./commands/ui";

import util from "util";

util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

const commander = new Command();

commander.name("roserepo");

commander.option("--debug", "Enable debug mode");
commander.on("option:debug", () => {
  process.env.DEBUG = "true";
});

commander.addCommand(changeset);
commander.addCommand(publish);
commander.addCommand(upgrade);
commander.addCommand(run);
commander.addCommand(ui);

commander.parse();