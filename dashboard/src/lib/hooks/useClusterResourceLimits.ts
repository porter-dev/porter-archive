import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import convert from "convert";
import { z } from "zod";

import { AWS_INSTANCE_LIMITS } from "main/home/app-dashboard/validate-apply/services-settings/tabs/utils";

import api from "shared/api";

const DEFAULT_INSTANCE_CLASS = "t3";
const DEFAULT_INSTANCE_SIZE = "medium";

type EncodedContract = {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  id: string;
  base64_contract: string;
  cluster_id: number;
  project_id: number;
  condition: string;
  condition_metadata: Record<string, unknown>;
};

type NodeGroup = {
  instanceType: string;
  minInstances: number;
  maxInstances: number;
  nodeGroupType: string;
  isStateful?: boolean;
};

type EksKind = {
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

type Cluster = {
  projectId: number;
  clusterId: number;
  kind: string;
  cloudProvider: string;
  cloudProviderCredentialsId: string;
  eksKind: EksKind;
};

type ContractData = {
  cluster: Cluster;
  user: {
    id: number;
  };
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
      instanceClass: DEFAULT_INSTANCE_CLASS,
      instanceSize: DEFAULT_INSTANCE_SIZE,
    };
    if (!data.labels) {
      return defaultResources;
    }
    const workloadKind = data.labels["porter.run/workload-kind"];
    if (!workloadKind || workloadKind !== "application") {
      return defaultResources;
    }
    const instanceType = data.labels["beta.kubernetes.io/instance-type"];
    const res = z
      .tuple([z.string(), z.string()])
      .safeParse(instanceType?.split("."));
    if (!res.success) {
      return defaultResources;
    }
    const [instanceClass, instanceSize] = res.data;
    if (
      AWS_INSTANCE_LIMITS[instanceClass] &&
      AWS_INSTANCE_LIMITS[instanceClass][instanceSize]
    ) {
      const { vCPU, RAM } = AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
      return {
        maxCPU: vCPU,
        maxRAM: RAM,
        instanceClass,
        instanceSize,
      };
    }
    return defaultResources;
  });

export const useClusterResourceLimits = ({
  projectId,
  clusterId,
}: {
  projectId: number | undefined;
  clusterId: number | undefined;
}): {
  maxCPU: number;
  maxRAM: number;
  // defaults indicate the resources assigned to new services
  defaultCPU: number;
  defaultRAM: number;
  clusterContainsGPUNodes: boolean;
  clusterIngressIp: string;
} => {
  const SMALL_INSTANCE_UPPER_BOUND = 0.75;
  const LARGE_INSTANCE_UPPER_BOUND = 0.9;
  const DEFAULT_MULTIPLIER = 0.125;
  const [clusterContainsGPUNodes, setClusterContainsGPUNodes] = useState(false);
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

  const getContract = useQuery(
    ["getContracts", projectId, clusterId],
    async () => {
      if (!projectId || !clusterId || clusterId === -1) {
        return false;
      }

      const res = await api.getContracts(
        "<token>",
        {},
        { project_id: projectId }
      );
      const contracts: EncodedContract[] = await z
        .array(z.any())
        .parseAsync(res.data);
      // Use zod to validate the data
      const latestContract = contracts
        .sort(
          (a, b) =>
            new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
        )
        .map((contract) => contract)[0];

      console.log("latestContract", latestContract);
      if (latestContract.condition === "SUCCESS") {
        const decodedContract = JSON.parse(
          atob(latestContract.base64_contract)
        ) as ContractData;

        // Check for NODE_GROUP_TYPE_CUSTOM with instanceType containing "g4dn"
        const containsCustomNodeGroup =
          decodedContract.cluster.eksKind.nodeGroups.some(
            (ng) =>
              (ng.nodeGroupType === "NODE_GROUP_TYPE_CUSTOM" &&
                ng.instanceType.includes("g4dn")) ||
              (ng.nodeGroupType === "NODE_GROUP_TYPE_APPLICATION" &&
                ng.instanceType.includes("g4dn"))
          );

        return containsCustomNodeGroup;
      }
      return false;
    },
    {
      enabled: !!projectId,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  useEffect(() => {
    if (getContract.isSuccess && getContract.data) {
      setClusterContainsGPUNodes(getContract.data);
    }
  }, [getContract.data, getContract.isSuccess]);

  useEffect(() => {
    if (getClusterNodes.isSuccess) {
      const data = getClusterNodes.data;
      // this logic handles CPU and RAM independently - we might want to change this later
      const maxCPU = data.reduce((acc, curr) => {
        return Math.max(acc, curr.maxCPU);
      }, 0);
      const maxRAM = data.reduce((acc, curr) => {
        return Math.max(acc, curr.maxRAM);
      }, 0);
      let maxMultiplier = SMALL_INSTANCE_UPPER_BOUND;
      // if the instance type has more than 4 GB ram, we use 90% of the ram/cpu
      // otherwise, we use 75%
      if (maxRAM > 4) {
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
      setDefaultCPU(Number((newMaxCPU * DEFAULT_MULTIPLIER).toFixed(2)));
      setDefaultRAM(Number((newMaxRAM * DEFAULT_MULTIPLIER).toFixed(0)));
    }
  }, [getClusterNodes]);

  const getCluster = useQuery(
    ["getCluster", projectId, clusterId],
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

  return {
    maxCPU,
    maxRAM,
    defaultCPU,
    defaultRAM,
    clusterContainsGPUNodes,
    clusterIngressIp,
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
