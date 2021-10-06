import { isAlphanumeric } from "shared/common";
import { ContextProps } from "shared/types";
import { proxy } from "valtio";
import { derive, devtools } from "valtio/utils";

export type OnboardingStateType = {
  projectName: string;
  // Null when is not setted yet.
  isProvisionerEnabled: boolean | null;
  userId: number | null;
};

export const OnboardingState = proxy<OnboardingStateType>({
  projectName: "",
  isProvisionerEnabled: null,
  userId: null,
});

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
  },
};
