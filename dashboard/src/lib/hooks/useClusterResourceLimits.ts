import { useEffect, useState } from "react";
import {
  Contract,
  GKENodePoolType,
  LoadBalancerType,
  NodeGroupType,
  NodePoolType,
} from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import convert from "convert";
import { match } from "ts-pattern";
import { z } from "zod";

import { azureMachineTypeDetails } from "components/azureUtils";
import { AWS_INSTANCE_LIMITS } from "main/home/app-dashboard/validate-apply/services-settings/tabs/utils";

import api from "shared/api";

const DEFAULT_INSTANCE_CLASS = "t3";
const DEFAULT_INSTANCE_SIZE = "medium";

export type ClientLoadBalancerType = "ALB" | "NLB" | "UNSPECIFIED";

const encodedContractValidator = z.object({
  ID: z.number(),
  CreatedAt: z.string(),
  UpdatedAt: z.string(),
  DeletedAt: z.string().nullable(),
  id: z.string(),
  base64_contract: z.string(),
  cluster_id: z.number(),
  project_id: z.number(),
  condition: z.string(),
  condition_metadata: z.record(z.any()).nullable(),
});

export type NodeGroup = {
  instanceType: string;
  minInstances: number;
  maxInstances: number;
  nodeGroupType: string;
  isStateful?: boolean;
};

export type EksKind = {
  clusterName: string;
  clusterVersion: string;
  cidrRange: string;
  region: string;
  nodeGroups: NodeGroup[];
  loadBalancer: {
    loadBalancerType: string;
  };
  logging: Record<string, unknown>;
  network: {
    vpcCidr: string;
    serviceCidr: string;
  };
};

export type GKEKind = {
  clusterName: string;
  clusterVersion: string;
  region: string;
  nodePools: NodePools[];
  user: {
    id: number;
  };
  network: {
    cidrRange: string;
    controlPlaneCidr: string;
    podCidr: string;
    serviceCidr: string;
  };
};

export type NodePools = {
  instanceType: string;
  minInstances: number;
  maxInstances: number;
  nodePoolType: string;
  isStateful?: boolean;
  additionalTaints?: string[];
};

const clusterNodesValidator = z
  .object({
    labels: z
      .object({
        "beta.kubernetes.io/instance-type": z.string().nullish(),
        "porter.run/workload-kind": z.string().nullish(),
      })
      .optional(),
  })
  .transform((data) => {
    const defaultResources = {
      maxCPU:
        AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].vCPU,
      maxRAM:
        AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].RAM,
      maxGPU: 1,
    };
    if (!data.labels) {
      return defaultResources;
    }
    const workloadKind = data.labels["porter.run/workload-kind"];
    if (
      !workloadKind ||
      (workloadKind !== "application" && workloadKind !== "custom")
    ) {
      return defaultResources;
    }
    const instanceType = data.labels["beta.kubernetes.io/instance-type"];

    if (!instanceType) {
      return defaultResources;
    }

    // Azure instance types are all prefixed with "Standard_"
    if (instanceType.startsWith("Standard_")) {
      const azureMachineType = azureMachineTypeDetails(instanceType);
      if (azureMachineType) {
        const { vCPU, RAM, GPU } = azureMachineType.resources;
        return {
          maxCPU: vCPU,
          maxRAM: RAM,
          maxGPU: GPU || 1,
        };
      } else {
        return defaultResources;
      }
    }

    let parsedType;
    if (instanceType && instanceType.includes(".")) {
      parsedType = z
        .tuple([z.string(), z.string()])
        .safeParse(instanceType.split("."));
    } else if (instanceType && instanceType.includes("-")) {
      const [instanceClass, ...instanceSizeParts] = instanceType.split("-");
      const instanceSize = instanceSizeParts.join("-");
      parsedType = z
        .tuple([z.string(), z.string()])
        .safeParse([instanceClass, instanceSize]);
    } else {
      return defaultResources; // Return defaults if instanceType format is not recognized
    }

    if (!parsedType.success) {
      return defaultResources;
    }

    const [instanceClass, instanceSize] = parsedType.data;
    if (AWS_INSTANCE_LIMITS[instanceClass]?.[instanceSize]) {
      const { vCPU, RAM, GPU } =
        AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
      return {
        maxCPU: vCPU,
        maxRAM: RAM,
        maxGPU: GPU || 1,
      };
    }
    return defaultResources;
  });

export const useClusterResourceLimits = ({
  projectId,
  clusterId,
  clusterStatus,
}: {
  projectId: number | undefined;
  clusterId: number | undefined;
  clusterStatus: string | undefined;
}): {
  maxCPU: number;
  maxRAM: number;
  // defaults indicate the resources assigned to new services
  defaultCPU: number;
  defaultRAM: number;
  clusterContainsGPUNodes: boolean;
  maxGPU: number;
  clusterIngressIp: string;
  loadBalancerType: ClientLoadBalancerType;
} => {
  const SMALL_INSTANCE_UPPER_BOUND = 0.75;
  const LARGE_INSTANCE_UPPER_BOUND = 0.9;
  const DEFAULT_MULTIPLIER = 0.125;
  const [clusterContainsGPUNodes, setClusterContainsGPUNodes] = useState(false);
  const [maxGPU, setMaxGPU] = useState(1);
  const [maxCPU, setMaxCPU] = useState(
    AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].vCPU *
      SMALL_INSTANCE_UPPER_BOUND
  );
  const [maxRAM, setMaxRAM] = useState(
    // round to nearest 100
    Math.round(
      (convert(
        AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].RAM,
        "GiB"
      ).to("MB") *
        SMALL_INSTANCE_UPPER_BOUND) /
        100
    ) * 100
  );
  const [defaultCPU, setDefaultCPU] = useState(
    AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].vCPU *
      DEFAULT_MULTIPLIER
  );
  const [defaultRAM, setDefaultRAM] = useState(
    // round to nearest 100
    Math.round(
      (convert(
        AWS_INSTANCE_LIMITS[DEFAULT_INSTANCE_CLASS][DEFAULT_INSTANCE_SIZE].RAM,
        "GiB"
      ).to("MB") *
        DEFAULT_MULTIPLIER) /
        100
    ) * 100
  );
  const [clusterIngressIp, setClusterIngressIp] = useState<string>("");
  const [loadBalancerType, setLoadBalancerType] =
    useState<ClientLoadBalancerType>("UNSPECIFIED");

  const getClusterNodes = useQuery(
    ["getClusterNodes", projectId, clusterId],
    async () => {
      if (!projectId || !clusterId || clusterId === -1) {
        return await Promise.resolve([]);
      }

      const res = await api.getClusterNodes(
        "<token>",
        {},
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      );
      return await z.array(clusterNodesValidator).parseAsync(res.data);
    },
    {
      enabled: !!projectId && !!clusterId,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const { data: contract } = useQuery(
    ["getContracts", projectId, clusterId, clusterStatus],
    async () => {
      if (!projectId || !clusterId || clusterId === -1) {
        return;
      }

      const res = await api.getContracts(
        "<token>",
        {},
        { project_id: projectId }
      );
      const contracts = await z
        .array(encodedContractValidator)
        .parseAsync(res.data);
      if (contracts.length) {
        const latestContract = contracts
          .filter((contract) => contract.cluster_id === clusterId)
          .sort(
            (a, b) =>
              new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
          )[0];
        const decodedContract = Contract.fromJsonString(
          atob(latestContract.base64_contract)
        );
        return decodedContract.cluster;
      }
    },
    {
      enabled: !!projectId,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  useEffect(() => {
    if (getClusterNodes.isSuccess) {
      const data = getClusterNodes.data;
      if (data.length) {
        // this logic handles CPU and RAM independently - we might want to change this later
        const maxCPU = data.reduce((acc, curr) => {
          return Math.max(acc, curr.maxCPU);
        }, 0);
        const maxRAM = data.reduce((acc, curr) => {
          return Math.max(acc, curr.maxRAM);
        }, 0);
        const maxGPU = data.reduce((acc, curr) => {
          return Math.max(acc, curr.maxGPU);
        }, 0);
        let maxMultiplier = SMALL_INSTANCE_UPPER_BOUND;
        // if the instance type has more than 16 GB ram, we use 90% of the ram/cpu
        // otherwise, we use 75%
        if (maxRAM > 16) {
          maxMultiplier = LARGE_INSTANCE_UPPER_BOUND;
        }
        // round down to nearest 0.5 cores
        const newMaxCPU = Math.floor(maxCPU * maxMultiplier * 2) / 2;
        // round down to nearest 100 MB
        const newMaxRAM =
          Math.round((convert(maxRAM, "GiB").to("MB") * maxMultiplier) / 100) *
          100;
        setMaxCPU(newMaxCPU);
        setMaxRAM(newMaxRAM);
        setMaxGPU(maxGPU);
        setDefaultCPU(Number((newMaxCPU * DEFAULT_MULTIPLIER).toFixed(2)));
        setDefaultRAM(Number((newMaxRAM * DEFAULT_MULTIPLIER).toFixed(0)));
      }
    }
  }, [getClusterNodes]);

  const getCluster = useQuery(
    ["getClusterIngressIp", projectId, clusterId],
    async () => {
      if (!projectId || !clusterId || clusterId === -1) {
        return await Promise.resolve({ ingress_ip: "" });
      }

      const res = await api.getCluster(
        "<token>",
        {},
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      );

      return await z.object({ ingress_ip: z.string() }).parseAsync(res.data);
    },
    {
      enabled: !!projectId && !!clusterId,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  useEffect(() => {
    if (getCluster.isSuccess) {
      setClusterIngressIp(getCluster.data.ingress_ip);
    }
  }, [getCluster]);

  useEffect(() => {
    if (contract) {
      const containsCustomNodeGroup = match(contract)
        .with({ kindValues: { case: "eksKind" } }, (c) => {
          return c.kindValues.value.nodeGroups.some(
            (ng) =>
              (ng.nodeGroupType === NodeGroupType.CUSTOM &&
                (ng.instanceType.includes("g4dn") ||
                  ng.instanceType.includes("p4d"))) ||
              (ng.nodeGroupType === NodeGroupType.APPLICATION &&
                (ng.instanceType.includes("g4dn") ||
                  ng.instanceType.includes("p4d")))
          );
        })
        .with({ kindValues: { case: "gkeKind" } }, (c) => {
          return c.kindValues.value.nodePools.some(
            (ng) =>
              (ng.nodePoolType === GKENodePoolType.GKE_NODE_POOL_TYPE_CUSTOM &&
                ng.instanceType.includes("n1")) ||
              (ng.nodePoolType ===
                GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION &&
                ng.instanceType.includes("n1"))
          );
        })
        .with({ kindValues: { case: "aksKind" } }, (c) => {
          return c.kindValues.value.nodePools.some(
            (ng) => ng.nodePoolType === NodePoolType.CUSTOM
          );
        })
        .otherwise(() => false);

      const loadBalancerType: ClientLoadBalancerType = match(contract)
        .with({ kindValues: { case: "eksKind" } }, (c) => {
          const loadBalancer = c.kindValues.value.loadBalancer;
          if (!loadBalancer) {
            return "UNSPECIFIED";
          }
          return match(loadBalancer.loadBalancerType)
            .with(LoadBalancerType.ALB, (): ClientLoadBalancerType => "ALB")
            .with(LoadBalancerType.NLB, (): ClientLoadBalancerType => "NLB")
            .otherwise((): ClientLoadBalancerType => "UNSPECIFIED");
        })
        .otherwise(() => "UNSPECIFIED");

      // console.log(gpu);
      // setMaxGPU(gpu);
      setClusterContainsGPUNodes(containsCustomNodeGroup);
      setLoadBalancerType(loadBalancerType);
    }
  }, [contract]);

  return {
    maxCPU,
    maxRAM,
    defaultCPU,
    defaultRAM,
    clusterContainsGPUNodes,
    maxGPU,
    clusterIngressIp,
    loadBalancerType,
  };
};

// this function returns the fraction which the resource sliders 'snap' to when the user turns on smart optimization
export const lowestClosestResourceMultipler = (
  min: number,
  max: number,
  value: number
): number => {
  const fractions = [0.5, 0.25, 0.125];

  for (const fraction of fractions) {
    const newValue = fraction * (max - min) + min;
    if (newValue <= value) {
      return fraction;
    }
  }

  return 0.125; // Return 0 if no fraction rounds down
};

// this function is used to snap both resource sliders in unison when one is changed
export const closestMultiplier = (
  min: number,
  max: number,
  value: number
): number => {
  const fractions = [0.5, 0.25, 0.125];
  let closestFraction = 0.125;
  for (const fraction of fractions) {
    const newValue = fraction * (max - min) + min;
    if (
      Math.abs(newValue - value) <
      Math.abs(closestFraction * (max - min) + min - value)
    ) {
      closestFraction = fraction;
    }
  }

  return closestFraction;
};
