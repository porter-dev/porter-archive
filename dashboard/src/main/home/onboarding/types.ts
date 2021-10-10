export type SupportedProviders = "aws" | "gcp" | "do";

export enum Steps {
  NEW_PROJECT = "new_project",
  CONNECT_SOURCE = "connect_source",
  CONNECT_REGISTRY = "connect_registry",
  PROVISION_RESOURCES = "provision_resources",
}

export type StepKey = `${Steps}`;
