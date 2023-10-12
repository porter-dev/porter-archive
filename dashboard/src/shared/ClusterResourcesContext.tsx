import React from "react";
import { useClusterResourceLimits } from "lib/hooks/useClusterResourceLimits";
import { createContext, useContext } from "react";
import { Context } from "./Context";

export type ClusterResources = {
  maxCPU: number;
  maxRAM: number;
  defaultCPU: number;
  defaultRAM: number;
  gpuNodes?: boolean;
};

export const ClusterResourcesContext = createContext<{
  currentClusterResources: ClusterResources;
} | null>(null);

export const useClusterResources = () => {
  const context = useContext(ClusterResourcesContext);
  if (context == null) {
    throw new Error(
      "useClusterResources must be used within a ClusterResourcesContext"
    );
  }
  return context;
};

const ClusterResourcesProvider = ({ children }: { children: JSX.Element }) => {
  const { currentCluster, currentProject } = useContext(Context);

  const { maxCPU, maxRAM, defaultCPU, defaultRAM, gpuNodes } = useClusterResourceLimits({
    projectId: currentProject?.id,
    clusterId: currentCluster?.id,
  });

  return (
    <ClusterResourcesContext.Provider
      value={{
        currentClusterResources: {
          maxCPU,
          maxRAM,
          defaultCPU,
          defaultRAM,
          gpuNodes,
        },
      }}
    >
      {children}
    </ClusterResourcesContext.Provider>
  );
};

export default ClusterResourcesProvider;