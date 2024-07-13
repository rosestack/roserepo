import {Workspace} from "~/domain/workspace";

import {WorkspaceFilterOptions} from "~/utils/filter";

import Graph from "~/utils/graph";

import BaseRunner from "./base";

import Task from "./helper/task";

//

interface ScriptPipeline {
  script: string;
  selfScript: string[];
  dependencyScript: string[];
  workspaceScript: WorkspaceScript[];
  runner: BaseRunner<unknown>;
}

interface WorkspacePipeline {
  id: string;
  children: string[];
  workspace: Workspace;
  scriptPipeline: ScriptPipeline;
}

//

interface WorkspaceScript extends WorkspaceFilterOptions {
  script?: string;
}

interface PipelineRunnerConfig {
  selfScript?: string | string[];
  dependencyScript?: string | string[];
  workspaceScript?: WorkspaceScript | WorkspaceScript[];
}

class PipelineRunner extends BaseRunner<PipelineRunnerConfig> {
  private scriptPipelines = () => {
    const scriptPipelines: ScriptPipeline[] = [];

    const visited = new Set<string>();

    const visit = (script: string) => {
      if (visited.has(script)) {
        return;
      }

      visited.add(script);

      let runner: BaseRunner<PipelineRunnerConfig | unknown> = this;

      if (script !== this.script) {
        const scriptRunner = this.roserepo.getRunner(script);

        scriptRunner.parent = this;

        scriptRunner.init(this.roserepo, script, this.runOptions);

        runner = scriptRunner;
      }

      let selfScripts: string[] = [];
      let dependencyScripts: string[] = [];
      let workspaceScripts: WorkspaceScript[] = [];

      if (runner instanceof PipelineRunner) {
        if (runner.config?.selfScript) {
          selfScripts = Array.isArray(runner.config.selfScript) ? runner.config.selfScript : [runner.config.selfScript];
        }

        if (runner.config?.dependencyScript) {
          dependencyScripts = Array.isArray(runner.config.dependencyScript) ? runner.config.dependencyScript : [runner.config.dependencyScript];
        }

        if (runner.config?.workspaceScript) {
          workspaceScripts = (Array.isArray(runner.config.workspaceScript) ? runner.config.workspaceScript : [runner.config.workspaceScript]).map((workspaceScript) => {
            return {
              ...workspaceScript,
              script: workspaceScript.script || script,
            };
          });
        }
      }

      const scripts = [
        ...selfScripts,
        ...dependencyScripts,
        ...workspaceScripts.map((workspaceScript) => {
          return workspaceScript.script;
        }),
      ];

      scriptPipelines.push({
        script,
        selfScript: selfScripts,
        dependencyScript: dependencyScripts,
        workspaceScript: workspaceScripts,
        runner,
      });

      scripts.forEach((script) => {
        visit(script);
      });
    };

    visit(this.script);

    return scriptPipelines;
  };

  private workspacePipelines = (scriptPipelines: ScriptPipeline[]) => {
    const filteredWorkspaces = this.filteredWorkspaces();

    const workspacePipelines: WorkspacePipeline[] = [];

    const visited = new Set<string>();

    const visit = (workspace: Workspace, script: string, id: string) => {
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

      const children = [];

      scriptPipeline.selfScript.forEach((selfScript) => {
        const selfId = `${workspace.name}:${selfScript}`;

        children.push(selfId);

        visit(workspace, selfScript, selfId);
      });

      scriptPipeline.dependencyScript.forEach((dependencyScript) => {
        const dependencies = [
          ...Object.keys(workspace.packageJson?.dependencies || {}),
          ...Object.keys(workspace.packageJson?.devDependencies || {}),
          ...Object.keys(workspace.packageJson?.peerDependencies || {}),
        ];

        const workspaces = this.roserepo.workspaces.filter((workspace) => {
          return dependencies.includes(workspace.name);
        });

        workspaces.forEach((workspace) => {
          const dependencyId = `${workspace.name}:${dependencyScript}`;

          children.push(dependencyId);

          visit(workspace, dependencyScript, dependencyId);
        });
      });

      scriptPipeline.workspaceScript.forEach((workspaceScript) => {
        const workspacesPipelines = this.roserepo.workspaces.filter((workspace) => {
          return workspace.match(workspaceScript);
        });

        workspacesPipelines.forEach((workspacePipeline) => {
          if (workspace === workspacePipeline) {
            return;
          }

          if (!workspacePipeline.hasExecutor(workspaceScript.script, scriptPipeline.runner)) {
            return;
          }

          const workspaceId = `${workspacePipeline.name}:${workspaceScript.script}`;

          children.push(workspaceId);

          visit(workspacePipeline, workspaceScript.script, workspaceId);
        });
      });

      workspacePipelines.push({
        id,
        children,
        workspace,
        scriptPipeline,
      });
    };

    filteredWorkspaces.forEach((workspace) => {
      if (workspace.hasExecutor(this.script, this)) {
        const id = `${workspace.name}:${this.script}`;
        visit(workspace, this.script, id);
      }
    });

    return workspacePipelines;
  };

  run = async () => {
    const scriptPipelines = this.scriptPipelines();
    const workspacePipelines = this.workspacePipelines(scriptPipelines);

    if (workspacePipelines.length === 0) {
      this.roserepo.logger.warn(`Found no tasks to run ${this.roserepo.logger.mark(this.script)}`);
      return;
    }

    const graph = new Graph<WorkspacePipeline>();

    workspacePipelines.forEach((workspacePipeline) => {
      graph.addVertex({
        id: workspacePipeline.id,
        children: workspacePipeline.children,
        data: workspacePipeline,
      });
    });

    const cyclic = graph.findCyclic();

    if (cyclic.isCyclic) {
      throw new Error(`Found cyclic dependencies ${this.roserepo.logger.mark(cyclic.cycleIds.join(" -> "))}`);
    }

    const runWorkspacePipelines = async (workspacePipelines: WorkspacePipeline[]) => {
      await Promise.all(lowLevelWorkspacePipelines.map(async (workspacePipeline) => {
        const {workspace, scriptPipeline} = workspacePipeline;

        const task = new Task({
          workspace,
          runner: scriptPipeline.runner,
          script: scriptPipeline.script,
          runOptions: this.runOptions,
        });

        await this.runTask(task);

        const parentWorkspacePipelines = workspacePipelines.filter((parentWorkspacePipeline) => {
          return parentWorkspacePipeline.children.length === 1 && parentWorkspacePipeline.children[0] === workspacePipeline.id;
        });

        if (parentWorkspacePipelines.length > 0) {
          await runWorkspacePipelines(parentWorkspacePipelines);
        }
      }));

      lowLevelWorkspacePipelines.forEach((workspacePipeline) => {
        graph.removeVertex(workspacePipeline.id);
      });
    };

    let lowLevelWorkspacePipelines = graph.findLowLevel();

    while (lowLevelWorkspacePipelines.length > 0) {
      await runWorkspacePipelines(lowLevelWorkspacePipelines);
      lowLevelWorkspacePipelines = graph.findLowLevel();
    }
  };
}

export type {
  PipelineRunnerConfig,
};

export default PipelineRunner;
