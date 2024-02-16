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
  type ClientPreflightCheck,
  type ClusterState,
  type ContractCondition,
  type NodeType,
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
    baseContract: Contract
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
    baseContract: Contract
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

    setIsHandlingPreflightChecks(true);
    try {
      const preflightCheckResp = await api.preflightCheck(
        "<token>",
        new PreflightCheckRequest({
          contract: newContract,
        }),
        {
          id: projectId,
        }
      );
      const parsed = await preflightCheckValidator.parseAsync(
        preflightCheckResp.data
      );

      if (parsed.errors.length > 0) {
        const cloudProviderSpecificChecks = match(
          clientContract.cluster.cloudProvider
        )
          .with("AWS", () => CloudProviderAWS.preflightChecks)
          .with("GCP", () => CloudProviderGCP.preflightChecks)
          .otherwise(() => []);

        const clientPreflightChecks: ClientPreflightCheck[] = parsed.errors
          .map((e) => {
            const preflightCheckMatch = cloudProviderSpecificChecks.find(
              (cloudProviderCheck) => e.name === cloudProviderCheck.name
            );
            if (!preflightCheckMatch) {
              return undefined;
            }
            return {
              title: preflightCheckMatch.displayName,
              status: "failure" as const,
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
        getErrorMessageFromNetworkCall(err, "Cluster preflight checks")
      );
    } finally {
      setIsHandlingPreflightChecks(false);
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
  nodes: NodeType[];
  isLoading: boolean;
};
export const useClusterNodeList = ({
  clusterId,
}: {
  clusterId: number | undefined;
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

      /*
      const res = await api.getClusterNodes(
        "<token>",
        {},
        { project_id: currentProject.id, cluster_id: clusterId }
      );
      */

      const data = [
        {
          name: "ip-10-78-124-178.us-west-1.compute.internal",
          labels: {
            "beta.kubernetes.io/arch": "amd64",
            "beta.kubernetes.io/instance-type": "t3.medium",
            "beta.kubernetes.io/os": "linux",
            "eks.amazonaws.com/capacityType": "ON_DEMAND",
            "eks.amazonaws.com/nodegroup":
              "applevisionporter-cluster-nt3632-system-85ji",
            "eks.amazonaws.com/nodegroup-image": "ami-0b1c494fc850ef41c",
            "failure-domain.beta.kubernetes.io/region": "us-west-1",
            "failure-domain.beta.kubernetes.io/zone": "us-west-1a",
            "k8s.io/cloud-provider-aws": "999a79e4af4e97770354cd39f216111e",
            "kubernetes.io/arch": "amd64",
            "kubernetes.io/hostname":
              "ip-10-78-124-178.us-west-1.compute.internal",
            "kubernetes.io/os": "linux",
            "node.kubernetes.io/instance-type": "t3.medium",
            "porter.run/workload-kind": "system",
            "topology.ebs.csi.aws.com/zone": "us-west-1a",
            "topology.kubernetes.io/region": "us-west-1",
            "topology.kubernetes.io/zone": "us-west-1a",
          },
          cpu_reqs: "1205m",
          memory_reqs: "2585Mi",
          ephemeral_storage_reqs: "0",
          fraction_cpu_reqs: 62.43523316062176,
          fraction_cpu_limits: 5.181347150259067,
          fraction_memory_reqs: 78.12166136025849,
          fraction_memory_limits: 97.5538579771429,
          fraction_ephemeral_storage_reqs: 0,
          fraction_ephemeral_storage_limits: 0,
          node_conditions: [
            {
              type: "MemoryPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:14:45Z",
              lastTransitionTime: "2024-02-12T17:02:05Z",
              reason: "KubeletHasSufficientMemory",
              message: "kubelet has sufficient memory available",
            },
            {
              type: "DiskPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:14:45Z",
              lastTransitionTime: "2024-02-12T17:02:05Z",
              reason: "KubeletHasNoDiskPressure",
              message: "kubelet has no disk pressure",
            },
            {
              type: "PIDPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:14:45Z",
              lastTransitionTime: "2024-02-12T17:02:05Z",
              reason: "KubeletHasSufficientPID",
              message: "kubelet has sufficient PID available",
            },
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2024-02-16T20:14:45Z",
              lastTransitionTime: "2024-02-12T17:02:21Z",
              reason: "KubeletReady",
              message: "kubelet is posting ready status",
            },
          ],
        },
        {
          name: "ip-10-78-139-61.us-west-1.compute.internal",
          labels: {
            "beta.kubernetes.io/arch": "amd64",
            "beta.kubernetes.io/instance-type": "t3.medium",
            "beta.kubernetes.io/os": "linux",
            "eks.amazonaws.com/capacityType": "ON_DEMAND",
            "eks.amazonaws.com/nodegroup":
              "applevisionporter-cluster-nt3632-application-3d5h",
            "eks.amazonaws.com/nodegroup-image": "ami-0b1c494fc850ef41c",
            "failure-domain.beta.kubernetes.io/region": "us-west-1",
            "failure-domain.beta.kubernetes.io/zone": "us-west-1c",
            "k8s.io/cloud-provider-aws": "999a79e4af4e97770354cd39f216111e",
            "kubernetes.io/arch": "amd64",
            "kubernetes.io/hostname":
              "ip-10-78-139-61.us-west-1.compute.internal",
            "kubernetes.io/os": "linux",
            "node.kubernetes.io/instance-type": "t3.medium",
            "porter.run/workload-kind": "application",
            "topology.ebs.csi.aws.com/zone": "us-west-1c",
            "topology.kubernetes.io/region": "us-west-1",
            "topology.kubernetes.io/zone": "us-west-1c",
          },
          cpu_reqs: "925m",
          memory_reqs: "1849624576",
          ephemeral_storage_reqs: "0",
          fraction_cpu_reqs: 47.92746113989637,
          fraction_cpu_limits: 0,
          fraction_memory_reqs: 53.30839689429775,
          fraction_memory_limits: 157.1182771073101,
          fraction_ephemeral_storage_reqs: 0,
          fraction_ephemeral_storage_limits: 0,
          node_conditions: [
            {
              type: "MemoryPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:13:04Z",
              lastTransitionTime: "2024-02-12T17:02:18Z",
              reason: "KubeletHasSufficientMemory",
              message: "kubelet has sufficient memory available",
            },
            {
              type: "DiskPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:13:04Z",
              lastTransitionTime: "2024-02-12T17:02:18Z",
              reason: "KubeletHasNoDiskPressure",
              message: "kubelet has no disk pressure",
            },
            {
              type: "PIDPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:13:04Z",
              lastTransitionTime: "2024-02-12T17:02:18Z",
              reason: "KubeletHasSufficientPID",
              message: "kubelet has sufficient PID available",
            },
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2024-02-16T20:13:04Z",
              lastTransitionTime: "2024-02-12T17:02:34Z",
              reason: "KubeletReady",
              message: "kubelet is posting ready status",
            },
          ],
        },
        {
          name: "ip-10-78-190-124.us-west-1.compute.internal",
          labels: {
            "beta.kubernetes.io/arch": "amd64",
            "beta.kubernetes.io/instance-type": "t3.medium",
            "beta.kubernetes.io/os": "linux",
            "eks.amazonaws.com/capacityType": "ON_DEMAND",
            "eks.amazonaws.com/nodegroup":
              "applevisionporter-cluster-nt3632-system-85ji",
            "eks.amazonaws.com/nodegroup-image": "ami-0b1c494fc850ef41c",
            "failure-domain.beta.kubernetes.io/region": "us-west-1",
            "failure-domain.beta.kubernetes.io/zone": "us-west-1c",
            "k8s.io/cloud-provider-aws": "999a79e4af4e97770354cd39f216111e",
            "kubernetes.io/arch": "amd64",
            "kubernetes.io/hostname":
              "ip-10-78-190-124.us-west-1.compute.internal",
            "kubernetes.io/os": "linux",
            "node.kubernetes.io/instance-type": "t3.medium",
            "porter.run/workload-kind": "system",
            "topology.ebs.csi.aws.com/zone": "us-west-1c",
            "topology.kubernetes.io/region": "us-west-1",
            "topology.kubernetes.io/zone": "us-west-1c",
          },
          cpu_reqs: "335m",
          memory_reqs: "829Mi",
          ephemeral_storage_reqs: "0",
          fraction_cpu_reqs: 17.357512953367877,
          fraction_cpu_limits: 0,
          fraction_memory_reqs: 25.053329697351757,
          fraction_memory_limits: 50.28798626826697,
          fraction_ephemeral_storage_reqs: 0,
          fraction_ephemeral_storage_limits: 0,
          node_conditions: [
            {
              type: "MemoryPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:30Z",
              lastTransitionTime: "2024-02-12T17:02:08Z",
              reason: "KubeletHasSufficientMemory",
              message: "kubelet has sufficient memory available",
            },
            {
              type: "DiskPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:30Z",
              lastTransitionTime: "2024-02-12T17:02:08Z",
              reason: "KubeletHasNoDiskPressure",
              message: "kubelet has no disk pressure",
            },
            {
              type: "PIDPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:30Z",
              lastTransitionTime: "2024-02-12T17:02:08Z",
              reason: "KubeletHasSufficientPID",
              message: "kubelet has sufficient PID available",
            },
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2024-02-16T20:15:30Z",
              lastTransitionTime: "2024-02-12T17:02:22Z",
              reason: "KubeletReady",
              message: "kubelet is posting ready status",
            },
          ],
        },
        {
          name: "ip-10-78-87-154.us-west-1.compute.internal",
          labels: {
            "beta.kubernetes.io/arch": "amd64",
            "beta.kubernetes.io/instance-type": "t3.large",
            "beta.kubernetes.io/os": "linux",
            "eks.amazonaws.com/capacityType": "ON_DEMAND",
            "eks.amazonaws.com/nodegroup":
              "applevisionporter-cluster-nt3632-monitoring-uajv",
            "eks.amazonaws.com/nodegroup-image": "ami-0b1c494fc850ef41c",
            "failure-domain.beta.kubernetes.io/region": "us-west-1",
            "failure-domain.beta.kubernetes.io/zone": "us-west-1a",
            "k8s.io/cloud-provider-aws": "999a79e4af4e97770354cd39f216111e",
            "kubernetes.io/arch": "amd64",
            "kubernetes.io/hostname":
              "ip-10-78-87-154.us-west-1.compute.internal",
            "kubernetes.io/os": "linux",
            "node.kubernetes.io/instance-type": "t3.large",
            "porter.run/workload-kind": "monitoring",
            "topology.ebs.csi.aws.com/zone": "us-west-1a",
            "topology.kubernetes.io/region": "us-west-1",
            "topology.kubernetes.io/zone": "us-west-1a",
          },
          cpu_reqs: "915m",
          memory_reqs: "1591Mi",
          ephemeral_storage_reqs: "0",
          fraction_cpu_reqs: 47.40932642487047,
          fraction_cpu_limits: 72.53886010362694,
          fraction_memory_reqs: 22.42443996159233,
          fraction_memory_limits: 63.36912763502145,
          fraction_ephemeral_storage_reqs: 0,
          fraction_ephemeral_storage_limits: 0,
          node_conditions: [
            {
              type: "MemoryPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:23Z",
              lastTransitionTime: "2024-02-12T17:01:55Z",
              reason: "KubeletHasSufficientMemory",
              message: "kubelet has sufficient memory available",
            },
            {
              type: "DiskPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:23Z",
              lastTransitionTime: "2024-02-12T17:01:55Z",
              reason: "KubeletHasNoDiskPressure",
              message: "kubelet has no disk pressure",
            },
            {
              type: "PIDPressure",
              status: "False",
              lastHeartbeatTime: "2024-02-16T20:15:23Z",
              lastTransitionTime: "2024-02-12T17:01:55Z",
              reason: "KubeletHasSufficientPID",
              message: "kubelet has sufficient PID available",
            },
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2024-02-16T20:15:23Z",
              lastTransitionTime: "2024-02-12T17:02:15Z",
              reason: "KubeletReady",
              message: "kubelet is posting ready status",
            },
          ],
        },
      ];

      const parsed = await z.array(nodeValidator).parseAsync(data);
      console.log("parsed", parsed);
      return parsed.filter(valueExists);
    },
    {
      enabled: !!currentProject && currentProject.id !== -1,
    }
  );

  return {
    nodes: clusterNodesReq.data ?? [],
    isLoading: clusterNodesReq.isLoading,
  };
};

const getErrorMessageFromNetworkCall = (
  err: unknown,
  networkCallDescription: string
): string => {
  if (axios.isAxiosError(err)) {
    const parsed = z
      .object({ error: z.string() })
      .safeParse(err.response?.data);
    if (parsed.success) {
      return `${networkCallDescription} failed: ${parsed.data.error}`;
    }
  }
  return `${networkCallDescription} failed: please try again or contact support@porter.run if the error persists.`;
};
