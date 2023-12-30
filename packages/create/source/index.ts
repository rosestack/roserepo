#!/usr/bin/env node

import {logger} from "roserepo";

import inquirer from "inquirer";

import type {Template} from "./templates";
import templates, {useTemplate} from "./templates";

import fs from "fs";
import path from "path";

logger.info("Creating a new project").line();

const create = async () => {
  const {projectName} = await inquirer.prompt({
    type: "input",
    name: "projectName",
    prefix: logger.config.symbol,
    message: logger.format("Name of the project?"),
    default: "my-project",
    transformer(input) {
      return input.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    },
  });

  const {projectLocation} = await inquirer.prompt({
    type: "input",
    name: "projectLocation",
    prefix: logger.config.symbol,
    message: logger.format("Location of the project?"),
    default: path.relative(process.cwd(), path.join(process.cwd(), projectName)),
    validate(input) {
      if (fs.existsSync(input)) {
        if (fs.statSync(input).isFile()) {
          return "The given project location is a file, not a directory.";
        }
      }

      return true;
    },
    filter(input) {
      if (path.isAbsolute(input)) {
        return input;
      }

      return path.join(process.cwd(), input);
    },
  });

  if (fs.existsSync(projectLocation)) {
    if (fs.readdirSync(projectLocation).length > 0) {
      const {overwrite} = await inquirer.prompt({
        type: "confirm",
        name: "overwrite",
        prefix: logger.config.symbol,
        message: logger.format("Location is not empty, should overwrite it?"),
        default: true,
      });

      if (!overwrite) {
        throw new Error("Project location is not empty, aborting.");
      }
    }
  }

  logger.info(`Creating '${projectName}' at '${projectLocation}'`);

  const getTemplate = async (parentTemplate?: Template): Promise<Template> => {
    if (parentTemplate) {
      if (!parentTemplate.options) {
        return parentTemplate;
      }

      const {template} = await inquirer.prompt({
        type: "list",
        name: "template",
        prefix: logger.config.symbol,
        message: logger.format(`What template you want to use for ${parentTemplate.name}`),
        choices: parentTemplate.options.map((template) => {
          return {
            type: "choice",
            name: template.name,
            value: template,
          };
        }),
      });

      if (template.options) {
        return getTemplate(template);
      }

      return template;
    }

    const {template} = await inquirer.prompt({
      type: "list",
      name: "template",
      prefix: logger.config.symbol,
      message: logger.format("What template would you like to use?"),
      choices: templates.map((template, index) => {
        return {
          type: "choice",
          value: template,
          name: template.name,
          checked: index === 0,
        };
      }),
    });

    if (template.options) {
      return getTemplate(template);
    }

    return template;
  };

  const template = await getTemplate();

  return useTemplate(template, projectName, projectLocation);
};

create().catch((error) => {
  logger.error("An error occurred while creating the project :" + error.message);
});