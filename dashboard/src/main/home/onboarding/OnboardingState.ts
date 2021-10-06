import { isAlphanumeric } from "shared/common";
import { ContextProps } from "shared/types";
import { proxy } from "valtio";
import { derive, devtools } from "valtio/utils";

export type OnboardingStateType = {
  [key: string]: unknown;
  projectName: string;
  // Null when is not setted yet.
  isProvisionerEnabled: boolean | null;
  userId: number | null;
  // Check if it's the first project that will be created
  isFirstProject: boolean | null;
};

const initialState: OnboardingStateType = {
  projectName: "",
  isProvisionerEnabled: null,
  userId: null,
  isFirstProject: null,
};

export const OnboardingState = proxy<OnboardingStateType>(initialState);

devtools(OnboardingState, "Onboarding state");

export const actions = {
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
  clearState: () => {
    Object.keys(OnboardingState).forEach((key) => {
      if (key in initialState) {
        OnboardingState[key] = initialState[key];
      }
    });
  },
};
