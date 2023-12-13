import { type DeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { type ProjectType } from "shared/types";

export const formattedPath = ({
  currentProject,
  tab,
  deploymentTarget,
  appName,
  queryParams,
}: {
  currentProject?: ProjectType;
  tab: string;
  deploymentTarget: DeploymentTarget;
  appName: string;
  queryParams?: Record<string, string>;
}): string => {
  let path = `/apps/${appName}/${tab}`;
  const query = new URLSearchParams();

  if (currentProject?.managed_deployment_targets_enabled) {
    query.set("target", deploymentTarget.id);
  }

  if (deploymentTarget.is_preview) {
    query.set("target", deploymentTarget.id);
    path = `/preview-environments/apps/${appName}/${tab}`;
  }

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      query.set(key, value);
    });
  }

  if (query.toString()) {
    path += `?${query.toString()}`;
  }

  return path;
};
