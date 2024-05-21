import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "shared/api";
import { Context } from "shared/Context";

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

const emptyDeploymentTarget: DeploymentTarget = {
  cluster_id: 0,
  created_at: "",
  id: "",
  is_default: false,
  is_preview: false,
  name: "",
  namespace: "",
  project_id: 0,
  updated_at: "",
};

export function useDefaultDeploymentTarget(): {
  defaultDeploymentTarget: DeploymentTarget;
  isDefaultDeploymentTargetLoading: boolean;
} {
  const { currentProject, currentCluster } = useContext(Context);

  const { data = emptyDeploymentTarget, isLoading } = useQuery(
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

      const object = await z
        .object({
          deployment_target: deploymentTargetValidator,
        })
        .parseAsync(res.data);

      return object.deployment_target;
    },
    {
      enabled:
        !!currentProject &&
        !!currentCluster &&
        currentProject.validate_apply_v2,
    }
  );

  return {
    defaultDeploymentTarget: data,
    isDefaultDeploymentTargetLoading: isLoading,
  };
}

export function useDeploymentTargetList(input: { preview: boolean }): {
  deploymentTargetList: DeploymentTarget[];
  isDeploymentTargetListLoading: boolean;
  refetchDeploymentTargetList: () => void;
} {
  const { currentProject, currentCluster } = useContext(Context);

  const { data = [], isLoading, refetch } = useQuery(
    [
      "listDeploymentTargets",
      currentProject?.id,
      currentCluster?.id,
      input.preview,
    ],
    async () => {
      if (!currentProject || !currentCluster) {
        return;
      }

      const res = await api.listDeploymentTargets(
        "<token>",
        {
          preview: input.preview,
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

  return {
    deploymentTargetList: data,
    isDeploymentTargetListLoading: isLoading,
    refetchDeploymentTargetList: refetch,
  };
}
