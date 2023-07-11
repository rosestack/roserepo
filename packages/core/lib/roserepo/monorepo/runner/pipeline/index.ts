import type { SetOptional } from "type-fest";

import type Roserepo from "~/roserepo";
import BaseRunner from "~monorepo/runner/base";

import Graph from "~shared/graph";

import type { RoserepoFilter } from "~/types";

interface RoserepoFilterScript extends SetOptional<RoserepoFilter, "type" | "match"> {
  script?: string;
}

interface ScriptPipeline {
  script: string;
  selfScripts: string[];
  dependencyScripts: string[];
  roserepoScripts: Required<RoserepoFilterScript>[];
  runner: BaseRunner<unknown>;
}

interface Pipeline {
  id: string;
  dependsOn: string[];
  roserepo: Roserepo;
  scriptPipeline: ScriptPipeline;
}

interface PipelineRunnerConfig {
  selfScript?: string | string[];
  dependencyScript?: string | string[];
  roserepoScript?: RoserepoFilterScript | RoserepoFilterScript[];
}

class PipelineRunner extends BaseRunner<PipelineRunnerConfig> {
  getScriptPipelines = () => {
    const scriptPipelines: ScriptPipeline[] = [];

    const visited = new Set<string>();

    const getScriptPipeline = (script: string) => {
      if ( visited.has(script) ) {
        return;
      }

      visited.add(script);

      let runner: BaseRunner<PipelineRunnerConfig> = this;

      if ( script !== this.script ) {
        const scriptRunner = this.roserepo.getRunner(script);

        if ( scriptRunner instanceof PipelineRunner ) {
          scriptRunner.init(script, this.options);
          runner = scriptRunner;
        }
      }

      let selfScripts: string[] = [];

      if ( runner.config?.selfScript ) {
        selfScripts = Array.isArray(runner.config.selfScript) ? runner.config.selfScript : [runner.config.selfScript];
      }

      let dependencyScripts: string[] = [];

      if ( runner.config?.dependencyScript ) {
        dependencyScripts = Array.isArray(runner.config.dependencyScript) ? runner.config.dependencyScript : [runner.config.dependencyScript];
      }

      let roserepoScripts: any[] = [];

      if ( runner.config?.roserepoScript ) {
        roserepoScripts = Array.isArray(runner.config.roserepoScript) ? runner.config.roserepoScript : [runner.config.roserepoScript];
        roserepoScripts = roserepoScripts.map((roserepoScript: RoserepoFilterScript) => {
          roserepoScript.type ??= "all";
          roserepoScript.match ??= "name";
          roserepoScript.script ??= script;

          return roserepoScript;
        });
      }

      const scripts = [
        ...selfScripts,
        ...dependencyScripts,
        ...roserepoScripts.map((roserepoScript) => {
          return roserepoScript.script;
        }),
      ];

      scriptPipelines.push({
        script,
        selfScripts,
        dependencyScripts,
        roserepoScripts,
        runner,
      });

      scripts.forEach((script) => {
        getScriptPipeline(script);
      });
    };

    getScriptPipeline(this.script);

    return scriptPipelines;
  };

  getPipelines = (scriptPipelines: ScriptPipeline[]) => {
    const filteredRoserepos = this.applyFilter(this.roserepos);

    const pipelines: Pipeline[] = [];

    const visited = new Set<string>();

    const getPipeline = (roserepo: Roserepo, script: string, id: string) => {
      if ( visited.has(id) ) {
        return;
      }

      visited.add(id);

      const scriptPipeline = scriptPipelines.find((scriptPipeline) => {
        return scriptPipeline.script === script;
      });

      if ( !scriptPipeline ) {
        return;
      }

      const dependsOn: string[] = [];

      scriptPipeline.selfScripts.forEach((script) => {
        const childId = `${ roserepo.name }:${ script }`;
        dependsOn.push(childId);

        return getPipeline(roserepo, script, childId);
      });

      scriptPipeline.dependencyScripts.forEach((dependencyScript) => {
        const dependencies = [
          ...Object.keys(roserepo.packageJson?.dependencies || {}),
          ...Object.keys(roserepo.packageJson?.devDependencies || {}),
          ...Object.keys(roserepo.packageJson?.peerDependencies || {}),
        ];

        const roserepos = this.roserepo.root.getChildren({
          type: "workspace",
          monorepoDepth: Infinity,
          workspaceDepth: Infinity,
        }).filter((roserepo) => {
          return dependencies.includes(roserepo.name);
        });

        roserepos.forEach((roserepo) => {
          const childId = `${ roserepo.name }:${ dependencyScript }`;
          dependsOn.push(childId);
          getPipeline(roserepo, dependencyScript, childId);
        });
      });

      scriptPipeline.roserepoScripts.forEach((roserepoFilterScript) => {
        const roserepos = this.roserepo.getChildren({
          type: roserepoFilterScript.type,
          workspaceDepth: Infinity,
          monorepoDepth: Infinity,
        }).filter((roserepo) => {
          return roserepo.match(roserepoFilterScript);
        });

        roserepos.forEach((roserepo) => {
          const childId = `${ roserepo.name }:${ roserepoFilterScript.script }`;

          if ( id !== childId ) {
            dependsOn.push(childId);
          }

          getPipeline(roserepo, roserepoFilterScript.script, childId);
        });
      });

      return pipelines.push({
        id,
        dependsOn,
        roserepo,
        scriptPipeline,
      });
    };

    filteredRoserepos.forEach((roserepo) => {
      const id = `${ roserepo.name }:${ this.script }`;
      getPipeline(roserepo, this.script, id);
    });

    return pipelines;
  };

  run = async () => {
    const scriptPipelines = this.getScriptPipelines();
    const pipelines = this.getPipelines(scriptPipelines);

    if ( pipelines.length === 0 ) {
      return this.logger.warn(`Found no tasks to run ${ this.logger.mark(this.script) }`);
    }

    const graph = new Graph<Pipeline>();

    pipelines.forEach((pipeline) => {
      graph.addVertex({
        id: pipeline.id,
        edges: pipeline.dependsOn,
        data: pipeline,
      });
    });

    const [ isCyclic, cycleVertices ] = graph.findCyclic();

    if ( isCyclic ) {
      const cyclePath = cycleVertices.map((vertex) => {
        return vertex.id;
      }).join(" -> ");

      return this.logger.error(`Cyclic dependency detected: ${ this.logger.mark(cyclePath) }`);
    }

    const topological2dSort = graph.topological2dSort();

    const tableTasks = topological2dSort.map((vertices) => {
      return vertices.map((vertex) => {
        const { roserepo, scriptPipeline } = vertex.data;

        return this.createTask(roserepo, scriptPipeline.script, this.options, scriptPipeline.runner);
      });
    });

    this.logger.info(`Running ${ tableTasks.flat().length } tasks`).line();

    for ( const tasks of tableTasks ) {
      await this.runTasks(tasks);
    }

    this.logger.line().info(`Finished running ${ this.logger.mark(this.script) }`);
  };
}

export type {
  PipelineRunnerConfig,
};

export default PipelineRunner;