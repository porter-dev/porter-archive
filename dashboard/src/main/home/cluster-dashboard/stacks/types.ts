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
};

export type CreateStackResponse = Stack;

export type GetStacksResponse = Stack[];

export type Stack = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  revisions: StackRevision[];

  latest_revision: StackRevision & {
    resources: AppResource[];
    source_configs: SourceConfig[];
  };
};

export type StackRevision = {
  id: number;
  created_at: string;
  status: "deploying" | "deployed" | "failed"; // type with enum
  stack_id: string;
  reason: "DeployError" | "SaveError" | "RollbackError";
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
