import { useContext } from "react";
import { Contract } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { clientClusterContractFromProto } from "lib/clusters";
import { SUPPORTED_CLOUD_PROVIDERS } from "lib/clusters/constants";
import {
  clusterStateValidator,
  clusterValidator,
  contractValidator,
  type APIContract,
  type ClientCluster,
  type ClientClusterContract,
  type ClusterState,
  type ContractCondition,
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
      const filtered = parsed
        .map((c) => {
          const cloudProviderMatch = SUPPORTED_CLOUD_PROVIDERS.find(
            (s) => s.name === c.cloud_provider
          );
          return cloudProviderMatch
            ? { ...c, cloud_provider: cloudProviderMatch }
            : null;
        })
        .filter(valueExists);
      const latestContractsRes = await api.getContracts(
        "<token>",
        { latest: true },
        { project_id: currentProject.id }
      );
      const latestContracts = await z
        .array(contractValidator)
        .parseAsync(latestContractsRes.data);
      return filtered
        .map((c) => {
          const latestContract = latestContracts.find(
            (contract) => contract.cluster_id === c.id
          );
          // if this cluster has no latest contract, don't include it
          if (!latestContract) {
            return undefined;
          }
          const latestClientContract = clientClusterContractFromProto(
            Contract.fromJsonString(atob(latestContract.base64_contract), {
              ignoreUnknownFields: true,
            })
          );
          // if we can't parse the latest contract, don't include it
          if (!latestClientContract) {
            return undefined;
          }
          return {
            ...c,
            contract: {
              ...latestContract,
              config: latestClientContract,
            },
          };
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
  refetchInterval,
}: {
  clusterId: number | undefined;
  refetchInterval?: number;
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

      // get the cluster + match with what we know
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

      // get the latest contract
      const latestContractsRes = await api.getContracts(
        "<token>",
        { latest: true, cluster_id: clusterId },
        { project_id: currentProject.id }
      );
      const latestContracts = await z
        .array(contractValidator)
        .parseAsync(latestContractsRes.data);
      if (latestContracts.length !== 1) {
        return;
      }
      const latestClientContract = clientClusterContractFromProto(
        Contract.fromJsonString(atob(latestContracts[0].base64_contract), {
          ignoreUnknownFields: true,
        })
      );
      if (!latestClientContract) {
        return;
      }

      // get the latest state
      const stateRes = await api.getClusterState(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: clusterId }
      );
      const state = await clusterStateValidator.parseAsync(stateRes.data);

      return {
        ...parsed,
        cloud_provider: cloudProviderMatch,
        state,
        contract: {
          ...latestContracts[0],
          config: latestClientContract,
        },
      };
    },
    {
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
      refetchInterval,
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
  clientContract: ClientClusterContract | undefined;
  clusterCondition: ContractCondition | undefined;
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
      const contractDB = filtered[0];
      const contractProto = Contract.fromJsonString(
        atob(contractDB.base64_contract),
        {
          ignoreUnknownFields: true,
        }
      );
      const clientContract = clientClusterContractFromProto(contractProto);
      return {
        contractDB,
        contractProto,
        clientContract,
        clusterCondition: contractDB.condition,
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
    clientContract: latestClusterContractReq.data?.clientContract,
    clusterCondition: latestClusterContractReq.data?.clusterCondition,
    isLoading: latestClusterContractReq.isLoading,
    isError: latestClusterContractReq.isError,
  };
};

type TUseClusterState = {
  state: ClusterState | undefined;
  isLoading: boolean;
  isError: boolean;
};
export const useClusterState = ({
  clusterId,
}: {
  clusterId: number | undefined;
}): TUseClusterState => {
  const { currentProject } = useContext(Context);

  const clusterStateReq = useQuery(
    ["getClusterState", currentProject?.id, clusterId],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !clusterId ||
        clusterId === -1
      ) {
        return;
      }
      const res = await api.getClusterState(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: clusterId }
      );
      return await clusterStateValidator.parseAsync(res.data);
    },
    {
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
      refetchInterval: 5000,
    }
  );

  return {
    state: clusterStateReq.data,
    isLoading: clusterStateReq.isLoading,
    isError: clusterStateReq.isError,
  };
};
