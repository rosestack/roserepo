import {Pattern} from "rosetil";

type Filter = Pattern | RoserepoFilter | RoserepoFilter[];

interface RoserepoFilter {
  type: "all" | "monorepo" | "microrepo" | "workspace";
  match: "name" | "directory" | "location";
  pattern: Pattern;
}

interface ChildrenFilter {
  type?: "all" | "monorepo" | "microrepo" | "workspace";
  monorepoDepth?: number;
  microrepoDepth?: number;
  workspaceDepth?: number;
}

export type {
  Filter,
  RoserepoFilter,
  ChildrenFilter,
};