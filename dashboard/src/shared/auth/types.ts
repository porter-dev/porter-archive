export type ScopeType =
  | "project"
  | "cluster"
  | "settings"
  | "namespace"
  | "application"
  | "release"
  | "registry"
  | "env_group"
  | "infra"
  | "job"
  | "integrations";

export type Verbs = "get" | "list" | "create" | "update" | "delete";

export type PolicyDocType = {
  scope: ScopeType;
  verbs: Verbs[];
  resources?: string[];
  children?: Partial<Record<ScopeType, PolicyDocType>>;
}

export enum ScopeTypeEnum {
  PROJECT = "project",
  CLUSTER = "cluster",
  SETTINGS = "settings",
  NAMESPACE = "namespace",
  APPLICATION = "application",
}

export type HIERARCHY_TREE = Record<string, any>;
