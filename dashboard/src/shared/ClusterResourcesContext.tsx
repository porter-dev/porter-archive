import React, { createContext, useContext } from "react";

import {
  useClusterResourceLimits,
  type ClientLoadBalancerType,
} from "lib/hooks/useClusterResourceLimits";

import { Context } from "./Context";

export type ClusterResources = {
  maxCPU: number;
  maxRAM: number;
  defaultCPU: number;
  defaultRAM: number;
  clusterContainsGPUNodes: boolean;
  clusterIngressIp: string;
  loadBalancerType: ClientLoadBalancerType;
  maxGPU: number;
};

export const ClusterResourcesContext = createContext<{
  currentClusterResources: ClusterResources;
} | null>(null);

export const useClusterResources = (): {
  currentClusterResources: ClusterResources;
} => {
  const context = useContext(ClusterResourcesContext);
  if (context == null) {
    throw new Error(
      "useClusterResources must be used within a ClusterResourcesContext"
    );
  }
  return context;
};

const ClusterResourcesProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { currentCluster, currentProject } = useContext(Context);

  const {
    maxCPU,
    maxRAM,
    defaultCPU,
    defaultRAM,
    maxGPU,
    clusterContainsGPUNodes,
    clusterIngressIp,
    loadBalancerType,
  } = useClusterResourceLimits({
    projectId: currentProject?.id,
    clusterId: currentCluster?.id,
    clusterStatus: currentCluster?.status,
  });

  return (
    <ClusterResourcesContext.Provider
      value={{
        currentClusterResources: {
          maxCPU: currentProject?.sandbox_enabled ? 0.2 : maxCPU,
          maxRAM: currentProject?.sandbox_enabled ? 250 : maxRAM,
          defaultCPU: currentProject?.sandbox_enabled ? 0.1 : defaultCPU,
          defaultRAM: currentProject?.sandbox_enabled ? 120 : defaultRAM,
          maxGPU,
          clusterContainsGPUNodes,
          clusterIngressIp,
          loadBalancerType,
        },
      }}
    >
      {children}
    </ClusterResourcesContext.Provider>
  );
};

export default ClusterResourcesProvider;
