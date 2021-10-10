import { ContextProps } from "shared/types";
import { proxy } from "valtio";
import { devtools } from "valtio/utils";
import StepHandler from "./StepHandler";
import { State as ConnectRegistryState } from "./steps/ConnectRegistry/ConnectRegistryState";

export type OnboardingStateType = {
  [key: string]: unknown;
  projectName: string;
  // Null when is not setted yet.
  isProvisionerEnabled: boolean | null;
  userId: number | null;
  // Check if it's the first project that will be created
  isFirstProject: boolean | null;

  actions: typeof actions;
};

const actions = {
  setProjectName: (name: string) => {
    OnboardingState.projectName = name;
  },
  setIsProvisionerEnabled: (provStatus: boolean) => {
    OnboardingState.isProvisionerEnabled = provStatus;
  },
  setUserId: (userId: number) => {
    OnboardingState.userId = userId;
  },
  setIsFirstProject: (isFirstProject: boolean) => {
    OnboardingState.isFirstProject = isFirstProject;
  },
  initFromGlobalContext: (context: Partial<ContextProps>) => {
    const provisionerStatus = context?.capabilities?.provisioner;

    if (typeof provisionerStatus === "boolean") {
      actions.setIsProvisionerEnabled(provisionerStatus);
    } else {
      actions.setIsProvisionerEnabled(null);
    }

    const userId = context?.user?.id;
    if (typeof userId === "number") {
      actions.setUserId(userId);
    } else {
      actions.setUserId(null);
    }
    if (context?.projects?.length >= 1) {
      actions.setIsFirstProject(false);
    } else {
      actions.setIsFirstProject(true);
    }
  },
  // Clear own and substates
  clearState: () => {
    Object.keys(OnboardingState).forEach((key) => {
      if (key in initialState && key !== "actions") {
        if (
          key.toLowerCase().includes("state") &&
          typeof OnboardingState === "object"
        ) {
          const subState = OnboardingState[key] as any;
          if (
            "clearState" in subState.actions &&
            typeof subState?.actions?.clearState === "function"
          ) {
            subState.actions.clearState();
          }
        }
        OnboardingState[key] = initialState[key];
      }
    });
  },
  saveState: () => {
    const json = JSON.stringify(OnboardingState);
    console.log(json);
    localStorage.setItem("onboarding", json);
  },
  restoreState: () => {},
};

const initialState: OnboardingStateType = {
  projectName: "",
  isProvisionerEnabled: null,
  userId: null,
  isFirstProject: null,
  selectedProvider: null,
  actions,
  connectRegistry_state: ConnectRegistryState,
  stepHandler_state: StepHandler,
};

export const OnboardingState = proxy<OnboardingStateType>(initialState);
devtools(OnboardingState, "Onboarding state");
