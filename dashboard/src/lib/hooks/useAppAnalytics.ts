import { useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";

type AppStep =
  | "stack-launch-complete"
  | "stack-launch-success"
  | "stack-launch-failure";

export const useAppAnalytics = (appName: string) => {
  const { currentCluster, currentProject } = useContext(Context);

  const updateAppStep = async (step: AppStep, errorMessage: string = "") => {
    try {
      if (!currentCluster?.id || !currentProject?.id) {
        return;
      }
      await api.updateStackStep(
        "<token>",
        {
          step,
          stack_name: appName,
          error_message: errorMessage,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
    } catch (err) {}
  };

  return {
    updateAppStep,
  };
};
