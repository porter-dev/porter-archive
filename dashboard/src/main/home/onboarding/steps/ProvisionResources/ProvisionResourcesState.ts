import { proxy } from "valtio";
import { ProvisionerConfig } from "../../state/StateHandler";
import { SkipProvisionConfig, SupportedProviders } from "../../types";

type AllowedSteps = "credentials" | "settings" | "status" | null;

interface ConnectRegistryState {
  selectedProvider: SupportedProviders | null;
  currentStep: AllowedSteps;
  config: Partial<Exclude<ProvisionerConfig, SkipProvisionConfig>> | null;
  actions: {
    selectProvider: (provider: SupportedProviders) => void;
    clearState: () => void;
    restoreState: (prevState: any) => void;
  };
}

const initialState: ConnectRegistryState = {
  selectedProvider: null,
  currentStep: "credentials",
  config: null,
  actions: {
    selectProvider(provider: SupportedProviders) {
      State.selectedProvider = provider;
    },

    clearState() {
      State.selectedProvider = null;
      State.currentStep = "credentials";
    },
    restoreState(prevState: any) {
      if (!prevState) {
        return;
      }
      if (prevState.selectedProvider) {
        State.selectedProvider = prevState.selectedProvider;
      }
      if (prevState.currentStep) {
        State.currentStep = prevState.currentStep;
      }
      if (prevState.config) {
        State.config = prevState.config;
      }
    },
  },
};

export const State = proxy(initialState);
