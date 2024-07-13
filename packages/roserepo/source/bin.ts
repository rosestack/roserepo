#!/usr/bin/env node

import {Command} from "commander";

import run from "./commands/run";
import upgrade from "./commands/upgrade";
import publish from "./commands/publish";
import version from "./commands/version";
import use from "./commands/use";

import util from "util";

util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

const commander = new Command();

commander.name("roserepo");

commander.option("--debug", "Enable debug mode");

commander.on("option:debug", () => {
  process.env.DEBUG = "true";
});

commander.addCommand(run);
commander.addCommand(upgrade);
commander.addCommand(publish);
commander.addCommand(version);
commander.addCommand(use);

commander.parse();
