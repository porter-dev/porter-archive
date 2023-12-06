import React, { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router";
import { z } from "zod";

import {
  deploymentTargetValidator,
  useDefaultDeploymentTarget,
  type DeploymentTarget,
} from "lib/hooks/useDeploymentTarget";

import api from "./api";
import { Context } from "./Context";

export const DeploymentTargetContext = createContext<{
  currentDeploymentTarget: DeploymentTarget | null;
} | null>(null);

export const useDeploymentTarget = (): {
  currentDeploymentTarget: DeploymentTarget | null;
} => {
  const context = useContext(DeploymentTargetContext);
  if (context === null) {
    throw new Error(
      "useDeploymentTarget must be used within a DeploymentTargetContext"
    );
  }
  return context;
};

const DeploymentTargetProvider = ({
  children,
}: {
  children: JSX.Element;
}): JSX.Element => {
  const { search } = useLocation();
  const { currentCluster, currentProject } = useContext(Context);
  const queryParams = new URLSearchParams(search);

  const deploymentTargetID = queryParams.get("target");
  const { defaultDeploymentTarget, isDefaultDeploymentTargetLoading } =
    useDefaultDeploymentTarget();

  const { data: deploymentTargetFromIdParam, status } = useQuery(
    [
      "getDeploymentTarget",
      {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
        deployment_target_id: deploymentTargetID,
      },
    ],
    async () => {
      if (!currentCluster || !currentProject || !deploymentTargetID) {
        return;
      }
      const res = await api.getDeploymentTarget(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          deployment_target_id: deploymentTargetID,
        }
      );

      const deploymentTarget = await z
        .object({ deployment_target: deploymentTargetValidator })
        .parseAsync(res.data);

      return deploymentTarget.deployment_target;
    },
    {
      enabled: !!currentCluster && !!currentProject && !!deploymentTargetID,
    }
  );

  const deploymentTarget: DeploymentTarget | null = useMemo(() => {
    if (!deploymentTargetID && isDefaultDeploymentTargetLoading) {
      return null;
    }

    if (deploymentTargetID) {
      if (status === "loading" || !deploymentTargetFromIdParam) {
        return null;
      }

      return deploymentTargetFromIdParam;
    }

    if (defaultDeploymentTarget) {
      return defaultDeploymentTarget;
    }

    return null;
  }, [
    deploymentTargetID,
    isDefaultDeploymentTargetLoading,
    defaultDeploymentTarget,
    deploymentTargetFromIdParam,
    status,
  ]);

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
