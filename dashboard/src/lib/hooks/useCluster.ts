import { useContext } from "react";
import { Contract } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { SUPPORTED_CLOUD_PROVIDERS } from "lib/clusters/constants";
import {
  clusterValidator,
  contractValidator,
  type APIContract,
  type ClientCluster,
} from "lib/clusters/types";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";

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

export const useLatestClusterContract = ({
  clusterId,
}: {
  clusterId: number | undefined;
}): {
  contractDB: APIContract | undefined;
  contractProto: Contract | undefined;
  isLoading: boolean;
  isError: boolean;
} => {
  const { currentProject } = useContext(Context);

  const latestClusterContractReq = useQuery(
    ["getLatestClusterContract", currentProject?.id, clusterId],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !clusterId ||
        clusterId === -1
      ) {
        return;
      }

      const res = await api.getContracts(
        "<token>",
        {},
        { project_id: currentProject.id }
      );

      const data = await z.array(contractValidator).parseAsync(res.data);
      const filtered = data.filter(
        (contract) => contract.cluster_id === clusterId
      );
      if (filtered.length === 0) {
        return;
      }
      const match = filtered[0];
      return {
        contractDB: match,
        contractProto: Contract.fromJsonString(atob(match.base64_contract), {
          ignoreUnknownFields: true,
        }),
      };
    },
    {
      refetchInterval: 3000,
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
    }
  );

  return {
    contractDB: latestClusterContractReq.data?.contractDB,
    contractProto: latestClusterContractReq.data?.contractProto,
    isLoading: latestClusterContractReq.isLoading,
    isError: latestClusterContractReq.isError,
  };
};
