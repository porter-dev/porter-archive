import { proxy } from "valtio";
import type {
  AWSProvisionerConfig,
  AWSRegistryConfig,
  DORegistryConfig,
  GCPProvisionerConfig,
  GCPRegistryConfig,
  SkipProvisionConfig,
  SkipRegistryConnection,
} from "../types";

export type ConnectedRegistryConfig =
  | AWSRegistryConfig
  | GCPRegistryConfig
  | DORegistryConfig
  | SkipRegistryConnection;

export type ProvisionerConfig =
  | AWSProvisionerConfig
  | GCPProvisionerConfig
  // | DOProvisionerConfig
  | SkipProvisionConfig;

export type ProjectData = {
  id: number;
  name: string;
};

export type ConnectedSourceData = {
  source: "github" | "docker";
};

export type OnboardingState = {
  project: ProjectData | null;
  connected_source: ConnectedSourceData | null;
  connected_registry: ConnectedRegistryConfig | null;
  provision_resources: ProvisionerConfig | null;
  actions: {
    restoreState: (state: OnboardingState) => void;
    clearState: () => void;
  };
};

export type StateKeys = keyof Omit<OnboardingState, "actions">;

export const StateHandler = proxy<OnboardingState>({
  project: null,
  connected_source: null,
  connected_registry: null,
  provision_resources: null,
  actions: {
    restoreState: (prevState) => {
      StateHandler.project = prevState.project;
      StateHandler.connected_source = prevState.connected_source;
      StateHandler.connected_registry = prevState.connected_registry;
      StateHandler.provision_resources = prevState.provision_resources;
    },
    clearState: () => {
      StateHandler.project = null;
      StateHandler.connected_source = null;
      StateHandler.connected_registry = null;
      StateHandler.provision_resources = null;
    },
  },
});
