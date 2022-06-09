export type CreateStackBody = {
  name: string;
  app_resources: {
    name: string;
    source_config_name: string;
    template_name: string;
    template_version: string;
    values: unknown;
  }[];
  source_configs: {
    name: string;
    image_repo_uri: string;
    build: {
      method: "pack" | "docker";
      folder_path: string;
      git?: unknown;
      buildpack?: unknown;
      dockerfile?: unknown;
    };
  }[];
};

export type CreateStackResponse = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  revisions: {
    id: number;
    created_at: string;
  }[];

  latest_revision: {
    id: number;
    created_at: string;
    resources: AppResource[];

    source_configs: SourceConfig[];
  };
};

export type SourceConfig = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;

  image_repo_uri: string;
  image_tag: string;

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
};
