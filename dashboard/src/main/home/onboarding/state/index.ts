import { proxy } from "valtio";
import { devtools } from "valtio/utils";
import {
  ConnectedRegistryConfig,
  ConnectedSourceData,
  ProjectData,
  StateHandler,
} from "./StateHandler";
import { StepHandler } from "./StepHandler";

export const OFState = proxy({
  StateHandler,
  StepHandler,
  actions: {
    nextStep: (data: any) => {
      const currentStep = StepHandler.currentStep;
      StateHandler[currentStep.state_key] = data;
      StepHandler.actions.nextStep();
      OFState.actions.saveState();
    },
    clearState: () => {
      StateHandler.actions.clearState();
      StepHandler.actions.clearState();
    },
    saveState: () => {
      const state = JSON.stringify(OFState);
      localStorage.setItem(
        `onboarding-${OFState.StateHandler.project.id}`,
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

      if (prevState?.StateHandler) {
        StateHandler.actions.restoreState(prevState.StateHandler);
      }
      if (prevState?.StepHandler) {
        StepHandler.actions.restoreState(prevState.StepHandler);
      }
    },
  },
});

devtools(OFState, "Onboarding flow state");
