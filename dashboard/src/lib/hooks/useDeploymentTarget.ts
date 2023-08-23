import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";

const deploymentTargetValidator = z.object({
  deployment_target_id: z.string(),
});
type DeploymentTarget = z.infer<typeof deploymentTargetValidator>;

export function useDefaultDeploymentTarget() {
  const { currentProject, currentCluster } = useContext(Context);
  const [
    deploymentTarget,
    setDeploymentTarget,
  ] = useState<DeploymentTarget | null>(null);

  const { data } = useQuery(
    ["getDefaultDeploymentTarget", currentProject?.id, currentCluster?.id],
    async () => {
      if (!currentProject?.id || !currentCluster?.id) {
        return;
      }
      const res = await api.getDefaultDeploymentTarget(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      );

      return deploymentTargetValidator.parseAsync(res.data);
    },
    {
      enabled: !!currentProject && !!currentCluster,
    }
  );

  useEffect(() => {
    if (data) {
      setDeploymentTarget(data);
    }
  }, [data]);

  return deploymentTarget;
}
