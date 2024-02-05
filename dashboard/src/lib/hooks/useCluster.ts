import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "shared/api";
import { Context } from "shared/Context";

export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string(),
  cloud_provider: z.enum(["AWS", "GCP", "Azure"]),
  cloud_provider_credential_identifier: z.string(),
  status: z.string(),
});
export type Cluster = z.infer<typeof clusterValidator>;
export const isAWSCluster = (
  cluster: Cluster
): cluster is Cluster & { cloud_provider: "AWS" } => {
  return cluster.cloud_provider === "AWS";
};

type TUseClusterList = {
  clusters: Array<z.infer<typeof clusterValidator>>;
  isLoading: boolean;
};
export const useClusterList = (): TUseClusterList => {
  const { currentProject } = useContext(Context);

  const clusterReq = useQuery(
    ["getClusters", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const res = await api.getClusters(
        "<token>",
        {},
        { id: currentProject.id }
      );
      const parsed = await z.array(clusterValidator).parseAsync(res.data);
      return parsed;
    },
    {
      enabled: !!currentProject && currentProject.id !== -1,
    }
  );

  return {
    clusters: clusterReq.data ?? [],
    isLoading: clusterReq.isLoading,
  };
};

type TUseCluster = {
  cluster: Cluster | undefined;
  isLoading: boolean;
};
export const useCluster = (): TUseCluster => {
  const { currentProject, currentCluster } = useContext(Context);

  const clusterReq = useQuery(
    ["getCluster", currentProject?.id, currentCluster?.id],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !currentCluster?.id ||
        currentCluster.id === -1
      ) {
        return;
      }
      const res = await api.getCluster(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: currentCluster.id }
      );
      const parsed = await clusterValidator.parseAsync(res.data);
      return parsed;
    },
    {
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!currentCluster &&
        currentCluster.id !== -1,
    }
  );

  return {
    cluster: clusterReq.data,
    isLoading: clusterReq.isLoading,
  };
};
