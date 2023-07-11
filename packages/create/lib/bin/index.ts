#!/usr/bin/env node

import prompts from "prompts";

import type { Template } from "./templates";
import templates, { useTemplate } from "./templates";

import path from "path";
import fs from "fs";

console.log("Create a new project");

const create = async () => {
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "What is the name of your project?",
    initial: "my-project",
    format: (value) => {
      return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    },
  });

  const { projectLocation } = await prompts({
    type: "text",
    name: "projectLocation",
    message: "Where would you like to create your project?",
    initial: ".",
    format: (value) => {
      if ( value === "." ) {
        return process.cwd();
      }
      if ( path.isAbsolute(value) ) {
        return value;
      }

      return path.join(process.cwd(), value);
    },
  });

  if ( fs.existsSync(projectLocation) ) {
    if ( fs.statSync(projectLocation).isFile() ) {
      throw new Error("The given project location is a file, not a directory.");
    }

    if ( fs.readdirSync(projectLocation).length > 0 ) {
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: "The given project location is not empty, do you want to overwrite it?",
        initial: true,
      });

      if ( !overwrite ) {
        throw new Error("The given project location is not empty, aborting.");
      }
    }
  }

  console.log(`Creating '${ projectName }' at '${ projectLocation }'`);

  const getTemplate = async (parentTemplate?: Template): Promise<Template> => {
    if ( parentTemplate ) {
      if ( !parentTemplate.options ) {
        return parentTemplate;
      }

      const { template } = await prompts({
        type: "select",
        name: "template",
        message: `What template would you like to use for ${ parentTemplate.name } template`,
        choices: parentTemplate.options.map((template) => {
          return {
            title: template.name,
            description: template.description,
            value: template,
          };
        }),
      });

      if ( template.options ) {
        return getTemplate(template);
      }

      return template;
    }

    const { template } = await prompts({
      type: "select",
      name: "template",
      message: "What template would you like to use?",
      choices: templates.map((template, index) => {
        return {
          title: template.name,
          description: template.description,
          value: template,
          selected: index === 0,
        };
      }),
    });

    if ( template.options ) {
      return getTemplate(template);
    }

    return template;
  };

  const template = await getTemplate();

  return useTemplate(template, projectName, projectLocation);
};

create().catch((error) => {
  console.error("An error occurred while creating the project", error);
});