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
    /*
    new_project: {
      url: "/onboarding/new-project",
      on: {
        continue: "connect_source",
      },
      execute: {
        on: {
          continue: "saveProjectData",
        },
      },
    },
    */
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
          },
        },
      },
    },
    provision_resources: {
      url: "/onboarding/provision",
      on: {
        skip: "provision_resources.connect_own_cluster",
        continue: "provision_resources.credentials",
        go_back: "connect_registry",
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
            continue: "clean_up",
            go_back: "provision_resources.credentials",
          },
          execute: {
            on: {
              continue: "saveResourceProvisioningSettings",
            },
          },
        },
      },
    },
    clean_up: {
      final: true,
      url: "/dashboard?tab=provisioner",
    },
  },
};

type StepHandlerType = {
  flow: FlowType;
  currentStepName: string;
  currentStep: Step;
  canGoBack?: boolean;
  actions: {
    nextStep: (action?: Action) => void;
    clearState: () => void;
    restoreState: (prevState: Partial<StepHandlerType>) => void;
    getStep: (nextStepName: string) => Step;
  };
};

export const StepHandler: StepHandlerType = proxy({
  flow,
  currentStepName: flow.initial,
  currentStep: flow.steps[flow.initial],
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
      const newStep = StepHandler.actions.getStep(nextStepName);
      StepHandler.currentStepName = nextStepName;
      StepHandler.currentStep = newStep;
      StepHandler.canGoBack = !!newStep?.on?.go_back;
      return;
    },
    getStep: (nextStepName: string) => {
      const [stepName, substep] = nextStepName.split(".");

      const step = flow.steps[stepName as Steps];

      let nextStep: Step = step;

      if (substep) {
        nextStep = step.substeps[substep];
      }
      return nextStep;
    },
    clearState: () => {
      StepHandler.currentStepName = flow.initial;
      StepHandler.currentStep = flow.steps[flow.initial];
    },
    restoreState: (prevState) => {
      StepHandler.currentStepName = prevState.currentStepName;
      StepHandler.currentStep = StepHandler.actions.getStep(
        prevState.currentStepName
      );
    },
  },
});

export const useSteps = () => {
  const snap = useSnapshot(StepHandler);
  const location = useLocation();
  const { pushFiltered } = useRouting();
  useEffect(() => {
    if (snap.currentStepName === "clean_up") {
      StepHandler.actions.clearState();
    }
    pushFiltered(snap.currentStep.url, ["tab"]);
  }, [location.pathname, snap.currentStep?.url]);
};
