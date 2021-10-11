import { proxy } from "valtio";
import { ConnectedRegistryConfig } from "../../state/StateHandler";
import { SkipRegistryConnection, SupportedProviders } from "../../types";

type AllowedSteps = "credentials" | "settings" | "test_connection" | null;

interface ConnectRegistryState {
  selectedProvider: SupportedProviders | null;
  currentStep: AllowedSteps;
  config: Partial<
    Exclude<ConnectedRegistryConfig, SkipRegistryConnection>
  > | null;
  actions: typeof actions;
}

const actions = {
  selectProvider(provider: SupportedProviders) {
    State.selectedProvider = provider;
  },

  clearState() {
    State.selectedProvider = null;
    State.currentStep = "credentials";
  },
  restoreState(prevState: any) {
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
};

const initialState: ConnectRegistryState = {
  selectedProvider: null,
  currentStep: "credentials",
  config: null,
  actions,
};

export const State = proxy(initialState);
