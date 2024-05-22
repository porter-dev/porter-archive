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
    id: number;
  };
  settings: {
    registry_connection_id: number;
    registry_name: string;
  };
};

export type GCPRegistryConfig = {
  skip: false;
  provider: "gcp";
  credentials: {
    id: number;
  };
  settings: {
    registry_connection_id: number;
    registry_name: string;
    gcr_url: string;
  };
};

export type GARRegistryConfig = {
  skip: false;
  provider: "gar";
  credentials: {
    id: number;
  };
  settings: {
    registry_connection_id: number;
    registry_name: string;
    gar_url: string;
  };
};

export type DORegistryConfig = {
  skip: false;
  provider: "do";
  credentials: {
    id: number;
  };
  settings: {
    registry_connection_id: number;
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
    registry_infra_id: number;
    cluster_infra_id: number;
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
    registry_infra_id: number;
    cluster_infra_id: number;
    region: string;
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
    registry_infra_id: number;
    cluster_infra_id: number;
  };
};

export type SkipProvisionConfig = {
  skip: true;
};

export type SkipRegistryConnection = SkipProvisionConfig;

export interface Onboarding {
  current_step: string;

  project_id?: number;
  project_name?: string;

  connected_source: "docker" | "github";

  skip_registry_connection: boolean;

  registry_connection_id: number;
  registry_connection_provider: string;
  registry_connection_credential_id: number;

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

export interface CompressedOnboardingState {
  current_step: string;
  connected_source: "github" | "docker";

  skip_registry_connection: boolean;
  skip_resource_provision: boolean;

  registry_connection_id: number;
  registry_connection_credential_id: number;
  registry_connection_provider: string;

  registry_infra_id: number;
  registry_infra_credential_id: number;
  registry_infra_provider: string;

  cluster_infra_id: number;
  cluster_infra_credential_id: number;
  cluster_infra_provider: number;
}

export interface OnboardingState {
  current_step: string;

  project_id?: number;
  project_name?: string;

  connected_source: "docker" | "github";

  skip_registry_connection: boolean;

  registry_connection_id: number;
  registry_connection_provider: string;
  registry_connection_credential_id: number;

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
