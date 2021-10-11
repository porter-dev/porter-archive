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
  },
};

export const State = proxy(initialState);
