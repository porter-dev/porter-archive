import { useContext, useState } from "react";
import { Contract, PreflightCheckRequest } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { match } from "ts-pattern";
import { z } from "zod";

import {
  clientClusterContractFromProto,
  updateExistingClusterContract,
} from "lib/clusters";
import {
  CloudProviderAWS,
  CloudProviderAzure,
  CloudProviderGCP,
  SUPPORTED_CLOUD_PROVIDERS,
} from "lib/clusters/constants";
import {
  clusterStateValidator,
  clusterValidator,
  contractValidator,
  createContractResponseValidator,
  nodeValidator,
  preflightCheckValidator,
  type APIContract,
  type ClientCluster,
  type ClientClusterContract,
  type ClientNode,
  type ClientPreflightCheck,
  type ClusterState,
  type ContractCondition,
  type UpdateClusterResponse,
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
          // if this cluster has no latest contract, don't include it in the response
          if (!latestContract) {
            return c;
          }
          const latestClientContract = clientClusterContractFromProto(
            Contract.fromJsonString(atob(latestContract.base64_contract), {
              ignoreUnknownFields: true,
            })
          );
          // if we can't parse the latest contract, don't include it in the response
          if (!latestClientContract) {
            return c;
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
        return {
          ...parsed,
          cloud_provider: cloudProviderMatch,
        };
      }
      const latestClientContract = clientClusterContractFromProto(
        Contract.fromJsonString(atob(latestContracts[0].base64_contract), {
          ignoreUnknownFields: true,
        })
      );
      if (!latestClientContract) {
        return {
          ...parsed,
          cloud_provider: cloudProviderMatch,
        };
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
        { cluster_id: clusterId, latest: true },
        { project_id: currentProject.id }
      );

      const data = await z.array(contractValidator).parseAsync(res.data);
      if (data.length !== 1) {
        return;
      }
      const contractDB = data[0];
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
      const parsed = await clusterStateValidator.parseAsync(res.data);
      return parsed;
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

type TUseUpdateCluster = {
  updateCluster: (
    clientContract: ClientClusterContract,
    baseContract: Contract,
    skipPreflightChecks?: boolean
  ) => Promise<UpdateClusterResponse>;
  isHandlingPreflightChecks: boolean;
  isCreatingContract: boolean;
};
export const useUpdateCluster = ({
  projectId,
}: {
  projectId: number | undefined;
}): TUseUpdateCluster => {
  const [isHandlingPreflightChecks, setIsHandlingPreflightChecks] =
    useState<boolean>(false);
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);

  const updateCluster = async (
    clientContract: ClientClusterContract,
    baseContract: Contract,
    skipPreflightChecks: boolean = false
  ): Promise<UpdateClusterResponse> => {
    if (!projectId) {
      throw new Error("Project ID is missing");
    }
    if (!baseContract.cluster) {
      throw new Error("Cluster is missing");
    }
    const newContract = new Contract({
      ...baseContract,
      cluster: updateExistingClusterContract(
        clientContract,
        baseContract.cluster
      ),
    });

    if (!skipPreflightChecks) {
      setIsHandlingPreflightChecks(true);
      try {
        let preflightCheckResp;
        if (
          clientContract.cluster.cloudProvider === "AWS" ||
          clientContract.cluster.cloudProvider === "Azure"
        ) {
          preflightCheckResp = await api.cloudContractPreflightCheck(
            "<token>",
            newContract,
            {
              project_id: projectId,
            }
          );
        } else {
          preflightCheckResp = await api.legacyPreflightCheck(
            "<token>",
            new PreflightCheckRequest({
              contract: newContract,
            }),
            {
              id: projectId,
            }
          );
        }

        const parsed = await preflightCheckValidator.parseAsync(
          preflightCheckResp.data
        );

        if (parsed.errors.length > 0) {
          const cloudProviderSpecificChecks = match(
            clientContract.cluster.cloudProvider
          )
            .with("AWS", () => CloudProviderAWS.preflightChecks)
            .with("GCP", () => CloudProviderGCP.preflightChecks)
            .with("Azure", () => CloudProviderAzure.preflightChecks)
            .otherwise(() => []);

          const clientPreflightChecks: ClientPreflightCheck[] = parsed.errors
            .map((e) => {
              const preflightCheckMatch = cloudProviderSpecificChecks.find(
                (cloudProviderCheck) => e.name === cloudProviderCheck.name
              );
              if (!preflightCheckMatch) {
                return {
                  title: "Unknown preflight check",
                  status: "failure" as const,
                  name: "UNKNOWN" as const,
                  error: {
                    detail:
                      "Your cloud provider returned an unknown error. Please reach out to Porter support.",
                    metadata: {},
                  },
                };
              }
              return {
                title: preflightCheckMatch.displayName,
                status: "failure" as const,
                name: preflightCheckMatch.name,
                error: {
                  detail: e.error.message,
                  metadata: e.error.metadata,
                  resolution: preflightCheckMatch.resolution,
                },
              };
            })
            .filter(valueExists);

          return {
            preflightChecks: clientPreflightChecks,
          };
        }
        // otherwise, continue to create the contract
      } catch (err) {
        throw new Error(
          getErrorMessageFromNetworkCall(
            err,
            "Cluster preflight checks",
            preflightCheckErrorReplacements
          )
        );
      } finally {
        setIsHandlingPreflightChecks(false);
      }
    }

    setIsCreatingContract(true);
    try {
      const createContractResp = await api.createContract(
        "<token>",
        newContract,
        {
          project_id: projectId,
        }
      );
      const parsed = await createContractResponseValidator.parseAsync(
        createContractResp.data
      );
      return {
        createContractResponse: parsed,
      };
    } catch (err) {
      throw new Error(getErrorMessageFromNetworkCall(err, "Cluster creation"));
    } finally {
      setIsCreatingContract(false);
    }
  };

  return {
    updateCluster,
    isHandlingPreflightChecks,
    isCreatingContract,
  };
};

type TUseClusterNodeList = {
  nodes: ClientNode[];
  isLoading: boolean;
};
export const useClusterNodeList = ({
  clusterId,
  refetchInterval = 3000,
}: {
  clusterId: number | undefined;
  refetchInterval?: number;
}): TUseClusterNodeList => {
  const { currentProject } = useContext(Context);

  const clusterNodesReq = useQuery(
    ["getClusterNodes", currentProject?.id, clusterId],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !clusterId ||
        clusterId === -1
      ) {
        return;
      }

      const res = await api.getClusterNodes(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: clusterId }
      );

      const parsed = await z.array(nodeValidator).parseAsync(res.data);
      const nodes = parsed
        .map((n) => {
          const nodeGroupType = match(n.labels["porter.run/workload-kind"])
            .with("application", () => "APPLICATION" as const)
            .with("system", () => "SYSTEM" as const)
            .with("monitoring", () => "MONITORING" as const)
            .with("custom", () => "CUSTOM" as const)
            .otherwise(() => "UNKNOWN" as const);
          if (nodeGroupType === "UNKNOWN") {
            return undefined;
          }
          const instanceTypeName = n.labels["node.kubernetes.io/instance-type"];
          if (!instanceTypeName) {
            return undefined;
          }
          // TODO: use more node information to narrow down which cloud provider instance type list to check against
          const instanceType =
            CloudProviderAWS.machineTypes.find(
              (i) => i.name === instanceTypeName
            ) ??
            CloudProviderAzure.machineTypes.find(
              (i) => i.name === instanceTypeName
            ) ??
            CloudProviderGCP.machineTypes.find(
              (i) => i.name === instanceTypeName
            );
          if (!instanceType) {
            return undefined;
          }
          return {
            nodeGroupType,
            instanceType,
          };
        })
        .filter(valueExists);
      return nodes;
    },
    {
      refetchInterval,
      enabled:
        !!currentProject &&
        currentProject.id !== -1 &&
        !!clusterId &&
        clusterId !== -1,
    }
  );

  return {
    nodes: clusterNodesReq.data ?? [],
    isLoading: clusterNodesReq.isLoading,
  };
};

export const uniqueCidrMetadataValidator = z.object({
  "overlapping-service-cidr": z.string(),
  "overlapping-vpc-cidr": z.string(),
  "suggested-service-cidr": z.string(),
  "suggested-vpc-cidr": z.string(),
});
const unavailableCidrMetadataValidator = z.object({
  "Conflicting CIDR range in this region": z.string(),
});

export const checksWithSuggestedChanges = ({
  preflightChecks,
}: {
  preflightChecks: ClientPreflightCheck[];
}): ClientPreflightCheck[] => {
  return preflightChecks.map((c) =>
    match(c.name)
      .with("enforceCidrUniqueness", () => {
        const parsed = uniqueCidrMetadataValidator.safeParse(
          c.error?.metadata || {}
        );
        if (!parsed.success) {
          return c;
        }
        const suggestion = {
          original: `Service CIDR:\n${parsed.data["overlapping-service-cidr"]}\n\nVPC CIDR:\n${parsed.data["overlapping-vpc-cidr"]}`,
          suggested: `Service CIDR:\n${parsed.data["suggested-service-cidr"]}\n\nVPC CIDR:\n${parsed.data["suggested-vpc-cidr"]}`,
        };

        return {
          ...c,
          suggestedChanges: suggestion,
        };
      })
      .with("cidrAvailability", () => {
        const cidrUniquenessCheck = preflightChecks.find(
          (c) => c.name === "enforceCidrUniqueness"
        );
        if (!cidrUniquenessCheck) {
          return c;
        }

        const uniqueCidrParsedMetadata = uniqueCidrMetadataValidator.safeParse(
          cidrUniquenessCheck.error?.metadata || {}
        );
        const unavailableCidrParsedMetadata =
          unavailableCidrMetadataValidator.safeParse(c.error?.metadata || {});
        if (
          !uniqueCidrParsedMetadata.success ||
          !unavailableCidrParsedMetadata.success
        ) {
          return c;
        }

        const unavailableCidr =
          unavailableCidrParsedMetadata.data[
            "Conflicting CIDR range in this region"
          ];
        if (
          unavailableCidr ===
          uniqueCidrParsedMetadata.data["overlapping-service-cidr"]
        ) {
          return {
            ...c,
            suggestedChanges: {
              original: `CIDR:\n${unavailableCidr}`,
              suggested: `CIDR:\n${uniqueCidrParsedMetadata.data["suggested-service-cidr"]}`,
            },
          };
        } else if (
          unavailableCidr ===
          uniqueCidrParsedMetadata.data["overlapping-vpc-cidr"]
        ) {
          return {
            ...c,
            suggestedChanges: {
              original: `CIDR:\n${unavailableCidr}`,
              suggested: `CIDR:\n${uniqueCidrParsedMetadata.data["suggested-vpc-cidr"]}`,
            },
          };
        }

        return c;
      })
      .otherwise(() => c)
  );
};

const preflightCheckErrorReplacements = {
  RequestThrottled:
    "Your cloud provider is currently throttling API requests. Please try again in a few minutes.",
};

export const getErrorMessageFromNetworkCall = (
  err: unknown,
  networkCallDescription: string,
  replaceError?: Record<string, string>
): string => {
  if (axios.isAxiosError(err)) {
    const parsed = z
      .object({ error: z.string() })
      .safeParse(err.response?.data);
    if (parsed.success) {
      if (replaceError) {
        for (const key in replaceError) {
          if (parsed.data.error.includes(key)) {
            return `${networkCallDescription} failed: ${replaceError[key]}`;
          }
        }
      }
      return `${networkCallDescription} failed: ${parsed.data.error}`;
    }
  }
  return `${networkCallDescription} failed: please try again or contact support@porter.run if the error persists.`;
};
