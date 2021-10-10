import { proxy } from "valtio";
import { StepKey, Steps } from "./types";

type Step = {
  previous?: StepKey;
  url: string;
  next?: StepKey;
  final?: true;
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
    },
    connect_source: {
      previous: "new_project",
      url: "/onboarding/source",
      next: "connect_registry",
    },
    connect_registry: {
      previous: "connect_source",
      url: "/onboarding/registry",
      next: "provision_resources",
    },
    provision_resources: {
      previous: "connect_registry",
      url: "/onboarding/provision",
      final: true,
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
