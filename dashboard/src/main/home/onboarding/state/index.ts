import api from "shared/api";
import { proxy } from "valtio";
import { CompressedOnboardingState, Onboarding } from "../types";
import { StateHandler } from "./StateHandler";
import { Action, StepHandler } from "./StepHandler";

export const OFState = proxy({
  StateHandler,
  StepHandler,
  subscriptions: [],
  actions: {
    initializeState: (state: Onboarding) => {
      OFState.actions.restoreState(state);
    },
    nextStep: (action?: Action, data?: any) => {
      const functionToExecute = StepHandler?.currentStep?.execute?.on[action];
      if (functionToExecute) {
        const actions: any = StateHandler.actions;
        const executable = actions[functionToExecute];
        if (typeof executable === "function") {
          executable(data);
        }
      }
      StepHandler.actions.nextStep(action);
      OFState.actions.saveState();
    },
    goTo: (step: string) => {
      StepHandler.actions.goTo(step);
      OFState.actions.saveState();
    },
    clearState: () => {
      StateHandler.actions.clearState();
      StepHandler.actions.clearState();
    },
    saveState: () => {
      const state = compressState(OFState);

      api
        .saveOnboardingState(
          "<token>",
          {
            ...state,
          },
          { project_id: OFState.StateHandler?.project?.id }
        )
        .then((res) => console.log(res))
        .catch((err) => console.log(err));
    },
    restoreState: (state: any) => {
      const prevState = decompressState(state);

      if (prevState?.StateHandler) {
        StateHandler.actions.restoreState(prevState.StateHandler);
      }
      if (prevState?.StepHandler) {
        StepHandler.actions.restoreState(prevState.StepHandler);
      }
    },
  },
});

const compressState = (state: typeof OFState) => {
  const currentStep = state.StepHandler?.currentStepName;
  const source = state.StateHandler?.connected_source;
  const registry = state.StateHandler?.connected_registry;
  const provision = state.StateHandler?.provision_resources;

  let onboarding_state: CompressedOnboardingState = {
    current_step: currentStep,

    connected_source: source,
    skip_registry_connection: registry?.skip,

    registry_connection_provider: registry?.provider,
    registry_connection_credential_id: registry?.credentials?.id,
    registry_connection_id: registry?.settings?.registry_connection_id,

    skip_resource_provision: provision?.skip,
    registry_infra_id: undefined,
    registry_infra_credential_id: provision?.credentials?.id,
    registry_infra_provider: provision?.provider,

    cluster_infra_id: undefined,
    cluster_infra_credential_id: provision?.credentials?.id,
    cluster_infra_provider: provision?.provider,
  };

  return onboarding_state;
};

const decompressState = (prev_state: any) => {
  const state: any = prev_state;

  const step = state.current_step;
  const project = {
    id: state.project_id,
    name: state.project_name,
  };

  let registry: any = {
    skip: state.skip_registry_connection,
    provider: state.registry_connection_provider,
    credentials: {
      id: state?.registry_connection_credential_id,
    },
    settings: {
      registry_connection_id: state?.registry_connection_id,
      registry_name: state?.registry_connection_data?.name,
    },
  };

  if (registry.provider === "gcp") {
    registry.settings.gcr_url = state.registry_connection_data?.url;
  } else if (registry.provider === "do") {
    registry.settings.registry_url = state.registry_connection_data?.url;
  }

  let provision: any = {
    skip: state.skip_resource_provision,
    provider: state.cluster_infra_provider,
    credentials: {
      id: state.cluster_infra_credential_id,
    },
    settings: {
      cluster_name: state.resource_provision_settings_cluster_name,
    },
  };

  if (provision.provider === "gcp") {
    provision.credentials.region = state.resource_provision_credentials_region;
  } else if (provision.provider === "aws") {
    provision.credentials.region = state.resource_provision_credentials_region;
    provision.credentials.arn = state.resource_provision_credentials_arn;
    provision.settings.aws_machine_type =
      state.resource_provision_settings_machine_type;
  } else if (provision.provider === "do") {
    provision.settings.tier = state.resource_provision_settings_tier;
    provision.settings.region = state.resource_provision_settings_region;
  }

  return {
    StepHandler: {
      currentStepName: step,
    },
    StateHandler: {
      project,
      connected_source: state.connected_source,
      connected_registry: registry,
      provision_resources: provision,
    },
  };
};
