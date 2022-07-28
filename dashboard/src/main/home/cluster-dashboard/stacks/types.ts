export type CreateStackBody = {
  name: string;
  app_resources: {
    name: string;
    source_config_name: string;
    template_name: string;
    template_version: string;
    template_repo_url?: string;
    values: unknown;
  }[];
  source_configs: {
    name: string;
    image_repo_uri: string;
    image_tag: string;
    build?: {
      method: "pack" | "docker";
      folder_path: string;
      git?: unknown;
      buildpack?: unknown;
      dockerfile?: unknown;
    };
  }[];

  env_groups: {
    name: string;
    variables: {
      [key: string]: string;
    };
    secret_variables: {
      [key: string]: string;
    };
    linked_applications: string[];
  }[];
};

export type CreateStackResponse = Stack;

export type GetStacksResponse = Stack[];

export type Stack = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  namespace: string;

  revisions: StackRevision[];

  latest_revision: FullStackRevision;
};

export type FullStackRevision = StackRevision & {
  resources: AppResource[];
  source_configs: SourceConfig[];
  env_groups: EnvGroup[];
};

type StackRevisionReason =
  | "DeployError"
  | "SaveError"
  | "RollbackError"
  | "EnvGroupUpgrade"
  | "ApplicationUpgrade"
  | "SourceConfigUpgrade"
  | "Rollback"
  | "CreationSuccess"
  | "AddEnvGroupSuccess"
  | "AddAppSuccess"
  | "RemoveEnvGroupSuccess"
  | "RemoveAppSuccess";

export type StackRevision = {
  id: number;
  created_at: string;
  status: "deploying" | "deployed" | "failed"; // type with enum
  stack_id: string;
  reason: StackRevisionReason;
  message: string;
};

export type SourceConfig = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  image_repo_uri: string;
  image_tag: string;

  stack_id: string;
  stack_revision_id: number;

  stable_source_config_id: string;

  build?: {
    method: "pack" | "docker";
    folder_path: string;
    git?: unknown;
    buildpack?: unknown;
    dockerfile?: unknown;
  };
};

export type AppResource = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  stack_id: string;

  stack_source_config: SourceConfig;
  stack_revision_id: number;
  stack_app_data: {
    template_repo_url: string;
    template_name: string;
    template_version: string;
  };
};

export type EnvGroup = {
  env_group_version: number;
  updated_at: string;
  stack_id: string;
  name: string;
  stack_revision_id: number;
  created_at: string;
  id: string;
};
