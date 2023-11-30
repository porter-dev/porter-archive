import React, { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router";

import {type DeploymentTarget, deploymentTargetValidator, useDefaultDeploymentTarget} from "lib/hooks/useDeploymentTarget";
import {useQuery} from "@tanstack/react-query";
import api from "./api";
import {z} from "zod";
import {Context} from "./Context";

export const DeploymentTargetContext = createContext<{
  currentDeploymentTarget: DeploymentTarget | null;
} | null>(null);

export const useDeploymentTarget = (): {currentDeploymentTarget: DeploymentTarget | null} =>  {
  const context = useContext(DeploymentTargetContext);
  if (context === null) {
    throw new Error(
      "useDeploymentTarget must be used within a DeploymentTargetContext"
    );
  }
  return context;
};

const DeploymentTargetProvider = ({ children }: { children: JSX.Element }):  JSX.Element => {
  const { search } = useLocation();
  const { currentCluster, currentProject } = useContext(Context)
  const queryParams = new URLSearchParams(search);

  const idParam = queryParams.get("target");
  const defaultDeploymentTarget = useDefaultDeploymentTarget();

  const { data: deploymentTargetFromIdParam, status } = useQuery(
      [
        "getDeploymentTarget",
        {
          cluster_id: currentCluster?.id,
          project_id: currentProject?.id,
          deployment_target_id: idParam,
        },
      ],
      async () => {
        if (!currentCluster || !currentProject || !idParam) {
          return;
        }
        const res = await api.getDeploymentTarget(
            "<token>",
            {},
            {
              project_id: currentProject.id,
              cluster_id: currentCluster.id,
              deployment_target_id: idParam,
            }
        );

        const deploymentTarget  = await z.object({deployment_target: deploymentTargetValidator}).parseAsync(res.data);

        return deploymentTarget.deployment_target;
      },
      {
        enabled:
            !!currentCluster &&
            !!currentProject &&
            !!idParam,
      }
  );

  const deploymentTarget: DeploymentTarget | null = useMemo(() => {
    if (!idParam && !defaultDeploymentTarget) {
      return null;
    }

    if (idParam) {
      if (status === "loading" || !deploymentTargetFromIdParam) {
        return null;
      }

        return deploymentTargetFromIdParam;
    }

    if (defaultDeploymentTarget) {
      return defaultDeploymentTarget;
    }

    return null;
  }, [idParam, defaultDeploymentTarget, deploymentTargetFromIdParam, status]);

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
