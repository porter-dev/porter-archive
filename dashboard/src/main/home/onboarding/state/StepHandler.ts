import { useEffect } from "react";
import { useLocation } from "react-router";
import { useRouting } from "shared/routing";
import { proxy, useSnapshot } from "valtio";
import { StepKey, Steps } from "../types";

type Step = {
  url: string;
  final?: true;
  substeps?: {
    [key in string]: Step;
  };
  on?: ActionHandler;
  execute?: {
    on: {
      skip?: string;
      continue?: string;
      go_back?: string;
    };
  };
};

export type Action = "skip" | "continue" | "go_back";
type ActionHandler = {
  skip?: string;
  continue: string;
  go_back?: string;
};

export type FlowType = {
  initial: StepKey;
  steps: {
    [key in Steps]: Step;
  };
};

const flow: FlowType = {
  initial: "connect_source",
  steps: {
    connect_source: {
      url: "/onboarding/source",
      on: {
        continue: "connect_registry",
      },
      execute: {
        on: {
          continue: "saveSelectedSource",
        },
      },
    },
    connect_registry: {
      url: "/onboarding/registry",
      on: {
        skip: "provision_resources",
        continue: "connect_registry.credentials",
        go_back: "connect_source",
      },
      execute: {
        on: {
          skip: "skipRegistryConnection",
          continue: "saveRegistryProvider",
        },
      },
      substeps: {
        credentials: {
          url: "/onboarding/registry/credentials",
          on: {
            continue: "connect_registry.settings",
            go_back: "connect_registry",
          },

          execute: {
            on: {
              continue: "saveRegistryCredentials",
              go_back: "clearRegistryProvider",
            },
          },
        },
        settings: {
          url: "/onboarding/registry/settings",
          on: {
            continue: "connect_registry.test_connection",
            go_back: "connect_registry.credentials",
          },

          execute: {
            on: {
              continue: "saveRegistrySettings",
            },
          },
        },
        test_connection: {
          url: "/onboarding/registry/test_connection",
          on: {
            continue: "provision_resources",
            /**
             * Enable this go_back as soon as connect registry
             * has a proper way of listing the registries and
             * manage them inside the step
             */
            // go_back: "connect_registry",
          },
        },
      },
    },
    provision_resources: {
      url: "/onboarding/provision",
      on: {
        skip: "provision_resources.connect_own_cluster",
        continue: "provision_resources.credentials",
        /**
         * Enable this go_back as soon as connect registry
         * has a proper way of listing the registries and
         * manage them inside the step
         */
        // go_back: "connect_registry",
      },
      execute: {
        on: {
          skip: "skipResourceProvisioning",
          continue: "saveResourceProvisioningProvider",
        },
      },
      substeps: {
        connect_own_cluster: {
          url: "/onboarding/provision/connect_own_cluster",
          on: {
            continue: "clean_up",
            go_back: "provision_resources",
          },
          execute: {
            on: {
              go_back: "clearResourceProvisioningProvider",
            },
          },
        },
        credentials: {
          url: "/onboarding/provision/credentials",
          on: {
            continue: "provision_resources.settings",
            go_back: "provision_resources",
          },
          execute: {
            on: {
              continue: "saveResourceProvisioningCredentials",
              go_back: "clearResourceProvisioningProvider",
            },
          },
        },
        settings: {
          url: "/onboarding/provision/settings",
          on: {
            continue: "provision_resources.status",
            go_back: "provision_resources.credentials",
          },
          execute: {
            on: {
              continue: "saveResourceProvisioningSettings",
            },
          },
        },
        status: {
          url: "/onboarding/provision/status",
          on: {
            continue: "clean_up",
            go_back: "provision_resources.credentials",
          },
        },
      },
    },
    clean_up: {
      final: true,
      url: "/applications",
    },
  },
};

type StepHandlerType = {
  flow: FlowType;
  currentStepName: string;
  currentStep: Step;
  canGoBack?: boolean;
  isSubFlow?: boolean;
  actions: {
    nextStep: (action?: Action) => void;
    clearState: () => void;
    restoreState: (prevState: Partial<StepHandlerType>) => void;
    goTo: (step: string) => void;
    setNewCurrentStep: (stepName: string) => { hasError: boolean };
  };
};

export const StepHandler: StepHandlerType = proxy({
  flow,
  currentStepName: flow.initial,
  currentStep: flow.steps[flow.initial],
  isSubFlow: false,
  actions: {
    nextStep: (action: Action = "continue") => {
      const cs = StepHandler.currentStep;

      if (cs.final) {
        return;
      }

      const nextStepName = cs.on[action];

      if (!nextStepName) {
        throw new Error(
          "No next step name found, fix the action triggering nextStep"
        );
      }
      StepHandler.actions.setNewCurrentStep(nextStepName);
      return;
    },
    getStep: (nextStepName: string) => {
      const [stepName, substep] = nextStepName.split(".");

      const step = flow.steps[stepName as Steps];

      let nextStep: Step = step;

      if (substep) {
        nextStep = step.substeps[substep];
      }
      return { step: nextStep, isChild: !!substep };
    },
    goTo: (step: string) => {
      const status = StepHandler.actions.setNewCurrentStep(step);
      if (status.hasError) {
        throw new Error(
          "No next step name found, fix the action triggering nextStep"
        );
      }
    },
    clearState: () => {
      StepHandler.actions.setNewCurrentStep(flow.initial);
    },
    restoreState: (prevState) => {
      if (
        !prevState?.currentStepName ||
        typeof prevState.currentStepName !== "string"
      ) {
        return;
      }
      const stepName = prevState.currentStepName;

      StepHandler.actions.setNewCurrentStep(stepName);
    },
    setNewCurrentStep: (newStepName: string) => {
      const [stepName, substep] = newStepName?.split(".");

      const isChild = !!substep;
      const step = flow.steps[stepName as Steps];

      let nextStep: Step = step;

      if (isChild) {
        nextStep = step.substeps[substep];
      }

      if (!nextStep) {
        return {
          hasError: true,
        };
      }

      StepHandler.currentStepName = newStepName;
      StepHandler.currentStep = nextStep;
      StepHandler.canGoBack = !!nextStep?.on?.go_back;
      StepHandler.isSubFlow = isChild;
      return {
        hasError: false,
      };
    },
  },
});

export const useSteps = (isParentLoading?: boolean) => {
  const snap = useSnapshot(StepHandler);
  const location = useLocation();
  const { pushFiltered } = useRouting();
  useEffect(() => {
    if (isParentLoading) {
      return;
    }
    if (snap.currentStepName === "clean_up") {
      StepHandler.actions.clearState();
    }
    pushFiltered(snap.currentStep.url, ["tab"]);
  }, [location.pathname, snap.currentStep?.url, isParentLoading]);
};
