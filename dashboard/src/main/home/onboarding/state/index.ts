import { proxy, subscribe } from "valtio";
import { devtools, subscribeKey } from "valtio/utils";
import { StateHandler } from "./StateHandler";
import { Action, StepHandler } from "./StepHandler";
import { State as ConnectRegistryState } from "../steps/ConnectRegistry/ConnectRegistryState";
import { State as ProvisionResourcesState } from "../steps/ProvisionResources/ProvisionResourcesState";

export const OFState = proxy({
  StateHandler,
  StepHandler,
  subscriptions: [],
  actions: {
    initializeState: (projectId: number) => {
      OFState.actions.restoreState(projectId);
      OFState.subscriptions = OFState.actions.subscribeToSubstates();
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
    clearState: () => {
      StateHandler.actions.clearState();
      StepHandler.actions.clearState();
      ConnectRegistryState.actions.clearState();
      ProvisionResourcesState.actions.clearState();
    },
    saveState: () => {
      const state = JSON.stringify(OFState);
      localStorage.setItem(
        `onboarding-${OFState.StateHandler.project?.id}`,
        state
      );
    },
    restoreState: (projectId: number) => {
      const notParsedPrevState = localStorage.getItem(
        `onboarding-${projectId}`
      );
      if (!notParsedPrevState) {
        return;
      }
      const prevState = JSON.parse(notParsedPrevState);

      if (prevState.StepHandler.finishedOnboarding) {
        return;
      }

      if (prevState?.StateHandler) {
        StateHandler.actions.restoreState(prevState.StateHandler);
      }
      if (prevState?.StepHandler) {
        StepHandler.actions.restoreState(prevState.StepHandler);
      }
      if (prevState?.substates.connected_registry) {
        ConnectRegistryState.actions.restoreState(
          prevState?.substates.connected_registry
        );
      }
      if (prevState?.substates.provision_resources) {
        ProvisionResourcesState.actions.restoreState(
          prevState?.substates?.provision_resources
        );
      }
    },
    // This is in charge of keeping track so the submodules doesn't have any external dependencies
    subscribeToSubstates: () => {
      return Object.keys(OFState.substates).map(
        (key: "connected_registry" | "provision_resources") => {
          return subscribe(OFState.substates[key], () => {
            OFState.actions.saveState();
          });
        }
      );
    },
    unsubscribeFromSubstates: () => {
      OFState.subscriptions.forEach((unsubscribe) =>
        typeof unsubscribe === "function" ? unsubscribe() : ""
      );
    },
  },
  substates: {
    connected_registry: ConnectRegistryState,
    provision_resources: ProvisionResourcesState,
  },
});
