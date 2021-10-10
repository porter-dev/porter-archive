import { proxy } from "valtio";

type AWSRegistryConfig = {
  provider: "aws";
  credentials: {
    id: string;
  };
  settings: {
    registry_name: string;
    region: string;
  };
};

type GCPRegistryConfig = {
  provider: "gcp";
  credentials: {
    id: string;
  };
  settings: {
    registry_name: string;
    gcr_url: string;
  };
};

type AWSProvisionerConfig = {
  skip: false;
  provider: "aws";
  credentials: {
    id: string;
  };
  settings: {
    cluster_name: string;
    aws_region: string;
    aws_machine_type: string;
  };
};

type GCPProvisionerConfig = {
  skip: false;
  provider: "gcp";
  credentials: {
    id: string;
  };
  settings: {
    gcp_region: string;
    cluster_name: string;
  };
};

type SkipProvisionConfig = {
  skip: true;
};

type OnboardingState = {
  project: {
    id: number;
    name: string;
  } | null;
  connected_source: {
    source: "github" | "docker";
  } | null;
  connected_registry: GCPRegistryConfig | AWSRegistryConfig | null;
  provision_resources:
    | GCPProvisionerConfig
    | AWSProvisionerConfig
    | SkipProvisionConfig
    | null;
  restoreState: (state: OnboardingState) => void;
  clearState: () => void;
};

export const State = proxy<OnboardingState>({
  project: null,
  connected_source: null,
  connected_registry: null,
  provision_resources: null,
  restoreState: (prevState) => {
    State.project = prevState.project;
    State.connected_source = prevState.connected_source;
    State.connected_registry = prevState.connected_registry;
    State.provision_resources = prevState.provision_resources;
  },
  clearState: () => {
    State.project = null;
    State.connected_source = null;
    State.connected_registry = null;
    State.provision_resources = null;
  },
});
