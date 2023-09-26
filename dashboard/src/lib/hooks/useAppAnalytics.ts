import { useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";

type AppStep =
  | "stack-launch-start"
  | "stack-launch-complete"
  | "stack-launch-success"
  | "stack-launch-failure"
  | "stack-deletion";

export const useAppAnalytics = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const updateAppStep = async ({
    appName,
    step,
    errorMessage = "",
    deleteWorkflow = false,
  }: {
    appName?: string;
    step: AppStep;
    errorMessage?: string;
    deleteWorkflow?: boolean;
  }) => {
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
          delete_workflow_file: deleteWorkflow,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
    } catch (err) { }
  };

  return {
    updateAppStep,
  };
};
