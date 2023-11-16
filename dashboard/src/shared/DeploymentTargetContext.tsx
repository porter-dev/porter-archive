import React, { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router";

import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

export type DeploymentTarget = {
  id: string;
  isPreview: boolean;
};

export const DeploymentTargetContext = createContext<{
  currentDeploymentTarget: DeploymentTarget | null;
} | null>(null);

export const useDeploymentTarget = () => {
  const context = useContext(DeploymentTargetContext);
  if (context === null) {
    throw new Error(
      "useDeploymentTarget must be used within a DeploymentTargetContext"
    );
  }
  return context;
};

const DeploymentTargetProvider = ({ children }: { children: JSX.Element }) => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);

  const idParam = queryParams.get("target");
  const defaultDeploymentTarget = useDefaultDeploymentTarget();

  const deploymentTarget: DeploymentTarget | null = useMemo(() => {
    if (!idParam && !defaultDeploymentTarget) {
      return null;
    }

    if (idParam) {
      return {
        id: idParam,
        isPreview: true,
      };
    }

    if (defaultDeploymentTarget) {
      return {
        id: defaultDeploymentTarget.deployment_target_id,
        isPreview: false,
      };
    }

    return null;
  }, [idParam, defaultDeploymentTarget]);

  return (
    <DeploymentTargetContext.Provider
      value={{
        currentDeploymentTarget: deploymentTarget,
      }}
    >
      {children}
    </DeploymentTargetContext.Provider>
  );
};

export default DeploymentTargetProvider;
