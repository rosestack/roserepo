import {Pattern, match} from "rosetil";

import {Workspace} from "~/domain/workspace";

interface PatternFilterConfig {
  include?: Pattern;
  exclude?: Pattern;
}

class PatternFilter {
  include?: Pattern;
  exclude?: Pattern;

  constructor(config?: PatternFilterConfig) {
    this.include = config?.include;
    this.exclude = config?.exclude;
  }

  match = (pattern: string) => {
    if (this.include) {
      if (!match(pattern, this.include)) {
        return false;
      }
    }

    if (this.exclude) {
      if (match(pattern, this.exclude)) {
        return false;
      }
    }

    return true;
  };
}

class PriorityPatternFilter {
  filters: PatternFilter[] = [];

  constructor(...filters: PatternFilter[]) {
    this.filters = filters;
  }

  match = (pattern: string) => {
    for (const filter of this.filters) {
      if (filter.include) {
        if (!match(pattern, filter.include)) {
          return false;
        }
      }

      if (filter.exclude) {
        if (match(pattern, filter.exclude)) {
          return false;
        }
      }
    }

    return true;
  };
}

interface WorkspaceFilterOptions {
  match?: "name" | "cwd";
  pattern: Pattern;
}

interface WorkspaceFilterConfig {
  include?: Pattern | WorkspaceFilterOptions | WorkspaceFilterOptions[];
  exclude?: Pattern | WorkspaceFilterOptions | WorkspaceFilterOptions[];
}

class WorkspaceFilter {
  readonly include: Required<WorkspaceFilterOptions>[] = [];
  readonly exclude: Required<WorkspaceFilterOptions>[] = [];

  private resolve = (filter: Pattern | WorkspaceFilterOptions | WorkspaceFilterOptions[]): Required<WorkspaceFilterOptions>[] => {
    const filters = Array.isArray(filter) ? filter : [filter];

    return filters.map((filter) => {
      if (filter instanceof RegExp || typeof filter === "string") {
        return {
          match: "name",
          pattern: filter,
        };
      }

      return {
        match: filter.match ?? "name",
        pattern: filter.pattern,
      };
    });
  };

  constructor(config?: WorkspaceFilterConfig) {
    if (config?.include) {
      this.include = this.resolve(config.include);
    }

    if (config?.exclude) {
      this.exclude = this.resolve(config.exclude);
    }
  }

  condition: (workspace: Workspace) => boolean;

  match = (workspace: Workspace) => {
    if (this.condition) {
      const justified = this.condition(workspace);

      if (!justified) {
        return false;
      }
    }

    if (this.include.length) {
      let matched = false;

      for (const workspaceFilterOptions of this.include) {
        if (workspace.match(workspaceFilterOptions)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        return false;
      }
    }

    if (this.exclude.length) {
      for (const workspaceFilterOptions of this.exclude) {
        if (workspace.match(workspaceFilterOptions)) {
          return false;
        }
      }
    }

    return true;
  };
}

class PriorityWorkspaceFilter {
  filters: WorkspaceFilter[] = [];

  constructor(...filters: WorkspaceFilter[]) {
    this.filters = filters;
  }

  condition: (workspace: Workspace) => boolean;

  match = (workspace: Workspace) => {
    if (this.condition) {
      const justified = this.condition(workspace);

      if (!justified) {
        return false;
      }
    }

    for (const filter of this.filters) {
      if (filter.include.length) {
        let matched = false;

        for (const workspaceFilterOptions of filter.include) {
          if (workspace.match(workspaceFilterOptions)) {
            matched = true;
            break;
          }
        }

        if (!matched) {
          return false;
        }
      }

      if (filter.exclude.length) {
        for (const workspaceFilterOptions of filter.exclude) {
          if (workspace.match(workspaceFilterOptions)) {
            return false;
          }
        }
      }
    }

    return true;
  };
}

//

export type {
  PatternFilterConfig,
};

export {
  PatternFilter,
  PriorityPatternFilter,
};

//

export type {
  WorkspaceFilterOptions,
  WorkspaceFilterConfig,
};

export {
  WorkspaceFilter,
  PriorityWorkspaceFilter,
};
