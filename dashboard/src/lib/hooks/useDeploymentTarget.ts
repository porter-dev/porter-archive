import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";

export const deploymentTargetValidator = z.object({
    id: z.string(),
    project_id: z.number(),
    cluster_id: z.number(),
    namespace: z.string(),
    name: z.string(),
    is_preview: z.boolean(),
    is_default: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});
export type DeploymentTarget = z.infer<typeof deploymentTargetValidator>;

export function useDefaultDeploymentTarget(): DeploymentTarget | null {
  const { currentProject, currentCluster } = useContext(Context);
  const [
    deploymentTarget,
    setDeploymentTarget,
  ] = useState<DeploymentTarget | null>(null);

  const { data } = useQuery(
    ["getDefaultDeploymentTarget", currentProject?.id, currentCluster?.id],
    async () => {
      // see Context.tsx L98 for why the last check is necessary
      if (
        !currentProject?.id ||
        !currentCluster?.id ||
        currentCluster.id === -1
      ) {
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

      const object = await z.object({
          deployment_target: deploymentTargetValidator,
      }).parseAsync(res.data);

      return object.deployment_target;
    },
    {
      enabled:
        !!currentProject &&
        !!currentCluster &&
        currentProject.validate_apply_v2,
    }
  );

  useEffect(() => {
    if (data) {
      setDeploymentTarget(data);
    }
  }, [data]);

  return deploymentTarget;
}

export function useListDeploymentTargets(preview: boolean): DeploymentTarget[] | undefined {
    const { currentProject, currentCluster } = useContext(Context);
    const [
        deploymentTargets,
        setDeploymentTargets,
    ] = useState<DeploymentTarget[] | undefined>(undefined);

    const { data  } = useQuery(
        ["listDeploymentTargets", currentProject?.id, currentCluster?.id, preview],
        async () => {
            if (!currentProject || !currentCluster) {
                return;
            }

            const res = await api.listDeploymentTargets(
                "<token>",
                {
                    preview,
                },
                {
                    project_id: currentProject?.id,
                    cluster_id: currentCluster?.id,
                }
            );

            const deploymentTargets = await z
                .object({
                    deployment_targets: z.array(deploymentTargetValidator),
                })
                .parseAsync(res.data);

            return deploymentTargets.deployment_targets;
        },
        {
            enabled: !!currentProject && !!currentCluster,
        }
    );

    useEffect(() => {
        if (data) {
            setDeploymentTargets(data);
        }
    }, [data]);

    return deploymentTargets;
}
