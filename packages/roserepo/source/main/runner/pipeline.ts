import type {SetOptional} from "type-fest";

import {RoserepoFilter} from "~shared/types";

import Roserepo from "~/main";

import BaseRunner from "./base";
import Graph from "~shared/graph";

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
      if (visited.has(script)) {
        return;
      }

      visited.add(script);

      let runner: BaseRunner<PipelineRunnerConfig> | BaseRunner<unknown> = this;

      if (script !== this.script) {
        const scriptRunner = this.roserepo.getRunner(script);

        if (!scriptRunner) {
          throw new Error(`Runner for script "${this.roserepo.logger.mark(script)}" not found`);
        }

        scriptRunner.rootRunner = this;

        scriptRunner.init(script, this.options);

        runner = scriptRunner;
      }

      let selfScripts: string[] = [];
      let dependencyScripts: string[] = [];
      let roserepoScripts: any[] = [];

      if (runner instanceof PipelineRunner) {
        if (runner.config?.selfScript) {
          selfScripts = Array.isArray(runner.config.selfScript) ? runner.config.selfScript : [runner.config.selfScript];
        }

        if (runner.config?.dependencyScript) {
          dependencyScripts = Array.isArray(runner.config.dependencyScript) ? runner.config.dependencyScript : [runner.config.dependencyScript];
        }

        if (runner.config?.roserepoScript) {
          roserepoScripts = Array.isArray(runner.config.roserepoScript) ? runner.config.roserepoScript : [runner.config.roserepoScript];
          roserepoScripts = roserepoScripts.map((roserepoScript: RoserepoFilterScript) => {
            roserepoScript.type ??= "all";
            roserepoScript.match ??= "name";
            roserepoScript.script ??= script;

            return roserepoScript;
          });
        }
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

  getRoserepoPipelines = (scriptPipelines: ScriptPipeline[]) => {
    const filteredRoserepos = this.applyFilter(this.roserepos);

    const pipelines: Pipeline[] = [];

    const visited = new Set<string>();

    const getPipeline = (roserepo: Roserepo, script: string, id: string) => {
      if (visited.has(id)) {
        return;
      }

      visited.add(id);

      const scriptPipeline = scriptPipelines.find((scriptPipeline) => {
        return scriptPipeline.script === script;
      });

      if (!scriptPipeline) {
        return;
      }

      const dependsOn: string[] = [];

      scriptPipeline.selfScripts.forEach((script) => {
        const childId = `${roserepo.name}:${script}`;
        dependsOn.push(childId);

        return getPipeline(roserepo, script, childId);
      });

      scriptPipeline.dependencyScripts.forEach((dependencyScript) => {
        const dependencies = [
          ...Object.keys(roserepo.packageJson?.dependencies || {}),
          ...Object.keys(roserepo.packageJson?.devDependencies || {}),
          ...Object.keys(roserepo.packageJson?.peerDependencies || {}),
        ];

        const roserepos = this.roserepo.root.filterChildren({
          type: "workspace",
        }).filter((roserepo) => {
          return dependencies.includes(roserepo.name);
        });

        roserepos.forEach((roserepo) => {
          const childId = `${roserepo.name}:${dependencyScript}`;
          dependsOn.push(childId);
          getPipeline(roserepo, dependencyScript, childId);
        });
      });

      scriptPipeline.roserepoScripts.forEach((roserepoFilterScript) => {
        const roserepos = this.roserepo.root.filterChildren({
          type: roserepoFilterScript.type,
        }).filter((roserepo) => {
          return roserepo.match(roserepoFilterScript);
        });

        roserepos.forEach((roserepo) => {
          const childId = `${roserepo.name}:${roserepoFilterScript.script}`;

          if (id !== childId) {
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
      const id = `${roserepo.name}:${this.script}`;
      getPipeline(roserepo, this.script, id);
    });

    return pipelines;
  };

  override run = async () => {
    const scriptPipelines = this.getScriptPipelines();
    const roserepoPipelines = this.getRoserepoPipelines(scriptPipelines);

    if (roserepoPipelines.length === 0) {
      return this.roserepo.logger.warn(`Found no tasks to run ${this.roserepo.logger.mark(this.script)}`);
    }

    const graph = new Graph<Pipeline>();

    roserepoPipelines.forEach((roserepoPipeline) => {
      graph.addVertex({
        id: roserepoPipeline.id,
        edges: roserepoPipeline.dependsOn,
        data: roserepoPipeline,
      });
    });

    const [isCyclic, cycleVertices] = graph.findCyclic();

    if (isCyclic) {
      const cyclePath = cycleVertices.map((vertex) => {
        return vertex.id;
      }).join(" -> ");

      throw new Error(`Cyclic dependency detected: ${cyclePath}`);
    }

    const topological2dSort = graph.topological2dSort();

    const tableTasks = topological2dSort.map((vertices) => {
      return vertices.map((vertex) => {
        const {roserepo, scriptPipeline} = vertex.data;

        return this.createTask(roserepo, scriptPipeline.script, this.options, scriptPipeline.runner);
      });
    });

    this.roserepo.logger.info(`Running ${tableTasks.flat().length} tasks`);

    for (const tasks of tableTasks) {
      await this.runTasks(tasks);
    }

    this.roserepo.logger.info("Finished");
  };
}

export type {
  PipelineRunnerConfig,
};

export default PipelineRunner;