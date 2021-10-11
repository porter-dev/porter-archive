export type SupportedProviders = "aws" | "gcp" | "do";

export enum Steps {
  NEW_PROJECT = "new_project",
  CONNECT_SOURCE = "connect_source",
  CONNECT_REGISTRY = "connect_registry",
  PROVISION_RESOURCES = "provision_resources",
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

export type SkipProvisionConfig = {
  skip: true;
};

export type SkipRegistryConnection = SkipProvisionConfig;
