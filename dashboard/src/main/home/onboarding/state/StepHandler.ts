import { useEffect } from "react";
import { useLocation } from "react-router";
import { useRouting } from "shared/routing";
import { proxy, useSnapshot } from "valtio";
import { devtools } from "valtio/utils";
import { StepKey, Steps } from "../types";
import { StateKeys } from "./StateHandler";

type Step = {
  previous?: StepKey;
  url: string;
  final?: true;
  substeps?: {
    [key in string]: SubStep;
  };
  on?: ActionHandler;
  execute?: {
    on: {
      skip?: string;
      continue?: string;
    };
  };
};

type SubStep = Omit<Step, "previous"> & {
  parent: StepKey;
  previous?: string;
};

export type Action = "skip" | "continue";
type ActionHandler = {
  skip?: string;
  continue: string;
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
      on: {
        continue: "connect_source",
      },
      execute: {
        on: {
          continue: "saveProjectData",
        },
      },
    },
    connect_source: {
      previous: "new_project",
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
      previous: "connect_source",
      url: "/onboarding/registry",
      on: {
        skip: "provision_resources",
        continue: "connect_registry.credentials",
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
          },
          parent: "connect_registry",
          execute: {
            on: {
              continue: "saveRegistryCredentials",
            },
          },
        },
        settings: {
          previous: "credentials",
          url: "/onboarding/registry/settings",
          on: {
            continue: "connect_registry.test_connection",
          },
          parent: "connect_registry",
          execute: {
            on: {
              continue: "saveRegistrySettings",
            },
          },
        },
        test_connection: {
          previous: "settings",
          url: "/onboarding/registry/test_connection",
          on: {
            continue: "provision_resources",
          },
          parent: "connect_registry",
        },
      },
    },
    provision_resources: {
      previous: "connect_registry",
      url: "/onboarding/provision",
      on: {
        skip: "provision_resources.connect_own_cluster",
        continue: "provision_resources.credentials",
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
          },
          parent: "provision_resources",
        },
        credentials: {
          url: "/onboarding/provision/credentials",
          on: { continue: "provision_resources.settings" },
          parent: "provision_resources",
          execute: {
            on: {
              continue: "saveResourceProvisioningCredentials",
            },
          },
        },
        settings: {
          previous: "credentials",
          url: "/onboarding/provision/settings",
          on: {
            continue: "clean_up",
          },
          parent: "provision_resources",
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
  currentStep: Step | SubStep;
  actions: {
    nextStep: (action?: Action) => void;
    clearState: () => void;
    restoreState: (prevState: StepHandlerType) => void;
    getStep: (nextStepName: string) => Step | SubStep;
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

      StepHandler.currentStepName = nextStepName;
      StepHandler.currentStep = StepHandler.actions.getStep(nextStepName);
      return;
    },
    getStep: (nextStepName: string) => {
      const [stepName, substep] = nextStepName.split(".");

      const step = flow.steps[stepName as Steps];

      let nextStep: Step | SubStep = step;

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
