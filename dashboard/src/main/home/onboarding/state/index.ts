import { proxy, subscribe } from "valtio";
import { devtools, subscribeKey } from "valtio/utils";
import { StateHandler } from "./StateHandler";
import { Action, StepHandler } from "./StepHandler";

export const OFState = proxy({
  StateHandler,
  StepHandler,
  subscriptions: [],
  actions: {
    initializeState: (projectId: number) => {
      OFState.actions.restoreState(projectId);
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
    },
  },
});
