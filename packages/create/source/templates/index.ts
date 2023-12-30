import path from "path";

import fs from "fs-extra";

interface Template {
  name: string;
  location: string;
  options?: Template[];
}

const empty: Template = {
  name: "empty",
  location: "empty",
  options: [
    {
      name: "javaScript",
      location: "empty/javascript",
    },
    {
      name: "typeScript",
      location: "empty/typescript",
    },
  ],
};

const templates = [
  empty,
];

const useTemplate = async (template: Template, name: string, location: string) => {
  const templateLocation = path.join(__dirname, "..", "templates", template.location);

  if (fs.existsSync(location)) {
    if (fs.readdirSync(location).length > 0) {
      fs.rmSync(location, {
        recursive: true,
        force: true,
      });
    }
  }

  fs.mkdirSync(location, {
    recursive: true,
  });

  fs.copySync(templateLocation, location);

  const packageJson = await fs.readJson(path.join(location, "package.json"));

  packageJson.name = name;

  return await fs.writeJson(path.join(location, "package.json"), packageJson, {
    spaces: 2,
  });
};

export type {
  Template,
};

export {
  useTemplate,
};

export default templates;