import { proxy } from "valtio";
import type {
  AWSProvisionerConfig,
  AWSRegistryConfig,
  DORegistryConfig,
  GARRegistryConfig,
  GCPProvisionerConfig,
  GCPRegistryConfig,
  SkipProvisionConfig,
  SkipRegistryConnection,
} from "../types";

export type ConnectedRegistryConfig =
  | AWSRegistryConfig
  | GCPRegistryConfig
  | GARRegistryConfig
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
  user_email: string;
  project: ProjectData | null;
  connected_source: ConnectedSourceData | null;
  connected_registry: ConnectedRegistryConfig | null;
  provision_resources: Partial<ProvisionerConfig> | null;
  actions: {
    restoreState: (state: OnboardingState) => void;
    clearState: () => void;
    [key: string]: any;
  };
};

export type StateKeys = keyof Omit<OnboardingState, "actions">;

export const StateHandler = proxy({
  user_email: null,
  project: null,
  connected_source: null,
  connected_registry: null,
  provision_resources: null,
  current_error: null,
  actions: {
    restoreState: (prevState: any) => {
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
    saveProjectData: (projectData: any) => {
      StateHandler.project = projectData;
    },
    saveSelectedSource: (source: string) => {
      StateHandler.connected_source = source;
    },
    skipRegistryConnection: () => {
      StateHandler.connected_registry = {
        skip: true,
      };
    },
    saveRegistryAndContinue: (data: any) => {
      const serviceToProvider = {
        ecr: "aws",
        gcr: "gcp",
        dcr: "do",
      };
      const connectedRegistry = {
        skip: false,
        provider: (serviceToProvider as any)[data?.service],
        credentials: {
          id: data?.id,
        },
      };
      StateHandler.connected_registry = connectedRegistry;
    },
    saveRegistryProvider: (provider: string) => {
      if (provider === StateHandler.connected_registry?.provider) {
        return;
      }

      StateHandler.connected_registry = {
        skip: false,
        provider: provider as any,
      };
    },
    saveRegistryCredentials: (credentials: any) => {
      StateHandler.connected_registry = {
        ...StateHandler.connected_registry,
        credentials,
      };
    },
    saveRegistrySettings: (settings: any) => {
      StateHandler.connected_registry = {
        ...StateHandler.connected_registry,
        settings,
      };
    },

    skipResourceProvisioning: () => {
      StateHandler.provision_resources = {
        skip: true,
      };
    },
    saveResourceProvisioningProvider: (provider: string) => {
      if (provider === StateHandler.provision_resources?.provider) {
        return;
      }

      StateHandler.provision_resources = {
        skip: provider === "external",
        provider: provider as any,
      };
    },
    saveResourceProvisioningCredentials: (credentials: any) => {
      StateHandler.provision_resources = {
        ...StateHandler.provision_resources,
        ...credentials,
      };
    },
    saveResourceProvisioningSettings: (settings: any) => {
      StateHandler.provision_resources = {
        ...StateHandler.provision_resources,
        ...settings,
      };
    },
    clearRegistryProvider: () => {
      StateHandler.connected_registry.provider = "";
    },
    clearResourceProvisioningProvider: () => {
      StateHandler.provision_resources.provider = "";
    },
    saveCurrentError: (data: any) => {
      StateHandler.current_error = data;
    },
  },
});
