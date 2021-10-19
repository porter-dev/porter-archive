export type SupportedProviders = "aws" | "gcp" | "do";

export enum Steps {
  CONNECT_SOURCE = "connect_source",
  CONNECT_REGISTRY = "connect_registry",
  PROVISION_RESOURCES = "provision_resources",
  CLEAN_UP = "clean_up",
}

export type StepKey = `${Steps}`;

export type AWSRegistryConfig = {
  skip: false;
  provider: "aws";
  credentials: {
    id: string;
  };
  settings: {
    registry_name: string;
  };
};

export type GCPRegistryConfig = {
  skip: false;
  provider: "gcp";
  credentials: {
    id: string;
  };
  settings: {
    registry_name: string;
    gcr_url: string;
  };
};

export type DORegistryConfig = {
  skip: false;
  provider: "do";
  credentials: {
    id: string;
  };
  settings: {
    registry_url: string;
  };
};

export type AWSProvisionerConfig = {
  skip: false;
  provider: "aws";
  credentials: {
    id: number;
    arn: string;
    region: string;
  };
  settings: {
    cluster_name: string;
    aws_machine_type: string;
  };
};

export type GCPProvisionerConfig = {
  skip: false;
  provider: "gcp";
  credentials: {
    id: number;
    region: string;
  };
  settings: {
    cluster_name: string;
  };
};

export type DOProvisionerConfig = {
  skip: false;
  provider: "do";
  credentials: {
    id: number;
  };
  settings: {
    region: string;
    cluster_name: string;
    tier: string;
  };
};

export type SkipProvisionConfig = {
  skip: true;
};

export type SkipRegistryConnection = SkipProvisionConfig;

export interface Onboarding {
  current_step: string;

  project_id: number;
  project_name: string;

  connected_source: "docker" | "github";

  skip_registry_connection: boolean;

  registry_connection_provider: string;
  registry_connection_credentials_id: number;
  registry_connection_settings_url: string;
  registry_connection_settings_name: string;

  skip_resource_provision: boolean;

  resource_provision_provider: string;
  resource_provision_credentials_id: number;
  resource_provision_credentials_arn: string;
  resource_provision_credentials_region: string;

  resource_provision_settings_cluster_name: string;
  resource_provision_settings_region: string;
  resource_provision_settings_tier: string;
  resource_provision_settings_machine_type: string;
}
