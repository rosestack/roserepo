import path from "path";
import fs from "fs-extra";

interface Template {
  name: string;
  description: string;
  location: string;
  options?: Template[];
}

const empty: Template = {
  name: "empty",
  description: "empty monorepo with no workspaces",
  location: "empty",
  options: [
    {
      name: "javaScript",
      description: "use javaScript as the default language",
      location: "empty/javascript",
    },
    {
      name: "typeScript",
      description: "use typeScript as the default language",
      location: "empty/typescript",
    },
  ],
};

const templates = [
  empty,
];

const useTemplate = ( template: Template, name: string, location: string ) => {
  const templateLocation = path.join( __dirname, "..", "templates", template.location );

  if ( fs.existsSync( location )) {
    if ( fs.readdirSync( location ).length > 0 ) {
      fs.rmSync( location, {
        recursive: true,
        force: true,
      });
    }
  }

  fs.mkdirSync( location, {
    recursive: true,
  });

  fs.copySync( templateLocation, location );

  return fs.readJson( path.join( location, "package.json" )).then( (packageJson) => {
    packageJson.name = name;

    return fs.writeJson( path.join( location, "package.json" ), packageJson, {
      spaces: 2,
    });
  });
};

export type {
  Template,
};

export {
  useTemplate,
};

export default templates;