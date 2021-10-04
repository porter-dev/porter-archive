import { ContextProps } from "shared/types";
import { proxy } from "valtio";

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
    if (typeof userId === "boolean") {
      actions.setIsProvisionerEnabled(userId);
    } else {
      actions.setIsProvisionerEnabled(null);
    }
  },
};
