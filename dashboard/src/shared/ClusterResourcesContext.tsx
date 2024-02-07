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

  var {
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

  if (currentProject?.sandbox_enabled) {
    defaultCPU = 0.1
    defaultRAM = 120
    maxRAM = 250
    maxCPU = 0.2
  }

  return (
    <ClusterResourcesContext.Provider
      value={{
        currentClusterResources: {
          maxCPU,
          maxRAM,
          defaultCPU,
          defaultRAM,
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
