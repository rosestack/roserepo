import inquirer from "inquirer";
import axios from "axios";

import semver from "semver";

import type Roserepo from "~/roserepo";
import fs from "fs";

interface Dependency {
  name: string;
  version: string;
  targetVersion?: string;
  availableVersions?: string[];
  peerVersion?: string;
}

class Upgrader {
  roserepo: Roserepo;

  private dependencies: Dependency[] = [];
  private devDependencies: Dependency[] = [];

  private fetchVersions = async (name: string): Promise<string[]> => {
    const { data } = await axios.get(`https://registry.npmjs.org/${ name }`);

    return Object.keys(data.versions);
  };

  private respectPeerDependencies = () => {
    const workspaceOption = this.roserepo.config?.workspace?.upgrade?.respectPeerDependencies;
    const monorepoOption = this.roserepo.config?.monorepo?.upgrade?.respectPeerDependencies;

    if ( workspaceOption !== undefined ) {
      return workspaceOption;
    }

    if ( monorepoOption !== undefined ) {
      return monorepoOption;
    }

    return true;
  };

  private objectToArray = async (dependencies: { [dependency: string]: string }) => {
    const excludeWorkspaceDependencies = this.roserepo.config?.workspace?.upgrade?.excludeDependencies ?? [];
    const excludeMonorepoDependencies = this.roserepo.config?.monorepo?.upgrade?.excludeDependencies ?? [];

    const dependencyArray = Object.entries(dependencies).map<Dependency>(([ name, version ]) => {
      let peerVersion: string | undefined;

      if ( this.respectPeerDependencies() ) {
        peerVersion = this.roserepo.packageJson?.peerDependencies?.[name];
      }

      return {
        name,
        version,
        peerVersion,
        availableVersions: [],
      };
    }).filter(({ name, version }) => {
      const workspaces = this.roserepo.root.getChildren({
        type: "workspace",
        workspaceDepth: Infinity,
        monorepoDepth: Infinity,
      });

      if ( workspaces.some((roserepo) => roserepo.packageJson?.name === name) ) {
        return false;
      }

      if ( excludeWorkspaceDependencies.includes(name) ) {
        return false;
      }

      if ( excludeMonorepoDependencies.includes(name) ) {
        return false;
      }

      if ( version === "*" ) {
        return false;
      }

      return semver.validRange(version);
    });

    await Promise.all(dependencyArray.map(async (dependency) => {
      try {
        dependency.availableVersions = await this.fetchVersions(dependency.name);
      } catch ( error ) {
        this.roserepo.logger.warn(`Failed to fetch versions for ${ dependency.name }`);
      }
    }));

    return dependencyArray;
  };

  constructor(roserepo: Roserepo) {
    this.roserepo = roserepo;
  }

  upgrade = async (askToInstallDependencies = true) => {
    try {
      if ( !this.roserepo.packageJson ) {
        throw new Error("Package.json not found");
      }

      this.roserepo.logger.info("Fetching dependencies");

      this.dependencies = await this.objectToArray(this.roserepo.packageJson?.dependencies ?? {});
      this.devDependencies = await this.objectToArray(this.roserepo.packageJson?.devDependencies ?? {});

      const dependenciesToUpdate: Dependency[] = [];
      const devDependenciesToUpdate: Dependency[] = [];

      const checkDependency = (dependency: Dependency): string | undefined => {
        let range = new semver.Range(dependency.peerVersion ?? dependency.version);

        if ( range.set.flat().every((set) => set.operator === "") ) {
          range = new semver.Range("*");
        }

        if ( !range ) {
          throw new Error(`Invalid range: ${ dependency.peerVersion ?? dependency.version } for ${ dependency.name }`);
        }

        let targetVersion = semver.maxSatisfying(dependency.availableVersions ?? [], range);

        if ( targetVersion ) {
          const installedVersion = semver.coerce(dependency.version);

          if ( installedVersion && semver.eq(targetVersion, installedVersion) ) {
            return;
          }

          if ( dependency.version && !dependency.peerVersion ) {
            if ( dependency.version.startsWith("~") || dependency.version.startsWith("^") ) {
              targetVersion = dependency.version[0] + targetVersion;
            }
          }

          return targetVersion;
        }
      };

      this.dependencies.forEach((dependency) => {
        const targetVersion = checkDependency(dependency);

        if ( targetVersion ) {
          dependenciesToUpdate.push({
            name: dependency.name,
            version: dependency.version,
            targetVersion,
          });
        }
      });
      this.devDependencies.forEach((dependency) => {
        const targetVersion = checkDependency(dependency);

        if ( targetVersion ) {
          devDependenciesToUpdate.push({
            name: dependency.name,
            version: dependency.version,
            targetVersion,
          });
        }
      });

      if ( dependenciesToUpdate.length === 0 && devDependenciesToUpdate.length === 0 ) {
        return this.roserepo.logger.info("No updates found");
      }

      this.roserepo.logger.info("Found updates").line();

      for ( const dependency of dependenciesToUpdate ) {
        this.roserepo.logger.log(`${ dependency.name }@${ dependency.version } -> ${ this.roserepo.logger.config.color(dependency.targetVersion) }`);
      }
      for ( const dependency of devDependenciesToUpdate ) {
        this.roserepo.logger.log(`${ dependency.name }@${ dependency.version } -> ${ this.roserepo.logger.config.color(dependency.targetVersion) }`);
      }

      this.roserepo.logger.line();

      let yesToAll = false;
      let noToAll = false;

      for ( const dependency of dependenciesToUpdate ) {
        let upgrade = yesToAll;

        if ( !upgrade ) {
          const { accept } = await inquirer.prompt({
            type: "list",
            name: "accept",
            prefix: this.roserepo.logger.config.symbol,
            message: `Upgrade ${ this.roserepo.logger.config.color(dependency.name) } from ${ this.roserepo.logger.config.color(dependency.version) } to ${ this.roserepo.logger.config.color(dependency.targetVersion) }?`,
            loop: false,
            choices: [
              {
                name: "Yes",
                value: "yes",
              },
              {
                name: "No",
                value: "no",
              },
              {
                name: "Yes to all",
                value: "yesToAll",
              },
              {
                name: "No to all",
                value: "noToAll",
              },
            ],
          });

          if ( accept === "no" ) {
            continue;
          }

          if ( accept === "noToAll" ) {
            noToAll = true;
            break;
          }

          if ( accept === "yes" ) {
            upgrade = true;
          }

          if ( accept === "yesToAll" ) {
            yesToAll = true;
          }
        }

        if ( upgrade ) {
          if ( !this.roserepo.packageJson?.dependencies ) {
            this.roserepo.packageJson.dependencies = {};
          }

          if ( dependency.targetVersion != null ) {
            this.roserepo.packageJson.dependencies[dependency.name] = dependency.targetVersion;
          }
        }
      }
      for ( const dependency of devDependenciesToUpdate ) {
        if ( noToAll ) {
          break;
        }

        let upgrade = yesToAll;

        if ( !upgrade ) {
          const { accept } = await inquirer.prompt({
            type: "list",
            name: "accept",
            prefix: this.roserepo.logger.config.symbol,
            message: `Upgrade ${ this.roserepo.logger.config.color(dependency.name) } from ${ this.roserepo.logger.config.color(dependency.version) } to ${ this.roserepo.logger.config.color(dependency.targetVersion) }?`,
            loop: false,
            choices: [
              {
                name: "Yes",
                value: "yes",
              },
              {
                name: "No",
                value: "no",
              },
              {
                name: "Yes to all",
                value: "yesToAll",
              },
              {
                name: "No to all",
                value: "noToAll",
              },
            ],
          });

          if ( accept === "no" ) {
            continue;
          }

          if ( accept === "noToAll" ) {
            break;
          }

          if ( accept === "yes" ) {
            upgrade = true;
          }

          if ( accept === "yesToAll" ) {
            yesToAll = true;
          }
        }

        if ( upgrade ) {
          if ( !this.roserepo.packageJson?.devDependencies ) {
            this.roserepo.packageJson.devDependencies = {};
          }

          if ( dependency.targetVersion != null ) {
            this.roserepo.packageJson.devDependencies[dependency.name] = dependency.targetVersion;
          }
        }
      }

      await fs.promises.writeFile(this.roserepo.resolve("package.json"), JSON.stringify(this.roserepo.packageJson, null, 2));

      this.roserepo.logger.line().info("Done");
    } catch ( error ) {
      this.roserepo.logger.error(error);
    }
  };
}

export default Upgrader;