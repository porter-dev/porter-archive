import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  CloudProviderAWS,
  SUPPORTED_CLOUD_PROVIDERS,
  type CloudProvider,
} from "main/home/infrastructure-dashboard/constants";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";

export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string(),
  cloud_provider: z.enum(["AWS", "GCP", "Azure", "Local"]),
  cloud_provider_credential_identifier: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SerializedCluster = z.infer<typeof clusterValidator>;
export type ClientCluster = Omit<SerializedCluster, "cloud_provider"> & {
  cloud_provider: CloudProvider;
};
export const isAWSCluster = (
  cluster: ClientCluster
): cluster is ClientCluster => {
  return cluster.cloud_provider === CloudProviderAWS;
};

type TUseClusterList = {
  clusters: ClientCluster[];
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
      return parsed
        .map((c) => {
          const cloudProviderMatch = SUPPORTED_CLOUD_PROVIDERS.find(
            (s) => s.name === c.cloud_provider
          );
          return cloudProviderMatch
            ? { ...c, cloud_provider: cloudProviderMatch }
            : null;
        })
        .filter(valueExists);
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
  cluster: ClientCluster | undefined;
  isLoading: boolean;
  isError: boolean;
};
export const useCluster = ({
  clusterId,
}: {
  clusterId: number | undefined;
}): TUseCluster => {
  const { currentProject } = useContext(Context);

  const clusterReq = useQuery(
    ["getCluster", currentProject?.id, clusterId],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !clusterId ||
        clusterId === -1
      ) {
        return;
      }
      const res = await api.getCluster(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: clusterId }
      );
      const parsed = await clusterValidator.parseAsync(res.data);
      const cloudProviderMatch = SUPPORTED_CLOUD_PROVIDERS.find(
        (s) => s.name === parsed.cloud_provider
      );
      if (!cloudProviderMatch) {
        return;
      }
      return { ...parsed, cloud_provider: cloudProviderMatch };
    },
    {
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
    }
  );

  return {
    cluster: clusterReq.data,
    isLoading: clusterReq.isLoading,
    isError: clusterReq.isError,
  };
};
