import { proxy } from "valtio";
import { StepKey, Steps } from "../types";
import { StateKeys } from "./StateHandler";

type Step = {
  previous?: StepKey;
  url: string;
  next?: StepKey;
  final?: true;
  state_key: StateKeys;
};

export type FlowType = {
  initial: StepKey;
  steps: {
    [key in Steps]: Step;
  };
};

const flow: FlowType = {
  initial: "new_project",
  steps: {
    new_project: {
      url: "/onboarding/new-project",
      next: "connect_source",
      state_key: "project",
    },
    connect_source: {
      previous: "new_project",
      url: "/onboarding/source",
      next: "connect_registry",
      state_key: "connected_source",
    },
    connect_registry: {
      previous: "connect_source",
      url: "/onboarding/registry",
      next: "provision_resources",
      state_key: "connected_registry",
    },
    provision_resources: {
      previous: "connect_registry",
      url: "/onboarding/provision",
      final: true,
      state_key: "provision_resources",
    },
  },
};

type StepHandlerType = {
  flow: FlowType;
  currentStepName: StepKey;
  currentStep: Step;
  actions: {
    nextStep: () => { redirectUrl: string };
    clearState: () => void;
    restoreState: (prevState: StepHandlerType) => void;
  };
};

export const StepHandler: StepHandlerType = proxy({
  flow,
  currentStepName: flow.initial,
  currentStep: flow.steps[flow.initial],
  actions: {
    nextStep: () => {
      const cs = StepHandler.currentStep;
      if (cs.final) {
        return {
          redirectUrl: "/dashboard?tab=provisioner",
        };
      }
      const nextStepName = cs.next;
      const nextStep = flow.steps[nextStepName];
      StepHandler.currentStep = nextStep;
      StepHandler.currentStepName = nextStepName;
      return {
        redirectUrl: nextStep.url,
      };
    },
    clearState: () => {
      StepHandler.currentStepName = flow.initial;
      StepHandler.currentStep = flow.steps[flow.initial];
    },
    restoreState: (prevState) => {
      StepHandler.currentStepName = prevState.currentStepName;
      StepHandler.currentStep = prevState.currentStep;
    },
  },
});
