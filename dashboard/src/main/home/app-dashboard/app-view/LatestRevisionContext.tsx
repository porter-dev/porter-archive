import React, { useMemo } from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";
import { createContext, useContext } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { PorterAppRecord, porterAppValidator } from "./AppView";
import { z } from "zod";
import { AppRevision, appRevisionValidator } from "lib/revisions/types";
import Loading from "components/Loading";
import Container from "components/porter/Container";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import notFound from "assets/not-found.png";
import styled from "styled-components";
import { SourceOptions } from "lib/porter-apps";
import { usePorterYaml } from "lib/hooks/usePorterYaml";
import { DetectedServices } from "lib/porter-apps/services";

export const LatestRevisionContext = createContext<{
  porterApp: PorterAppRecord;
  latestRevision: AppRevision;
  latestProto: PorterApp;
  servicesFromYaml: DetectedServices | null;
  clusterId: number;
  projectId: number;
  deploymentTargetId: string;
} | null>(null);

export const useLatestRevision = () => {
  const context = useContext(LatestRevisionContext);
  if (context === null) {
    throw new Error(
      "useLatestRevision must be used within a LatestRevisionContext"
    );
  }
  return context;
};

export const LatestRevisionProvider = ({
  appName,
  children,
}: {
  appName?: string;
  children: JSX.Element;
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const deploymentTarget = useDefaultDeploymentTarget();

  const appParamsExist =
    !!appName && !!currentCluster && !!currentProject && !!deploymentTarget;

  const { data: porterApp, status: porterAppStatus } = useQuery(
    ["getPorterApp", currentCluster?.id, currentProject?.id, appName],
    async () => {
      if (!appParamsExist) {
        return;
      }

      const res = await api.getPorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: appName,
        }
      );

      const porterApp = await porterAppValidator.parseAsync(res.data);
      return porterApp;
    },
    {
      enabled: appParamsExist,
    }
  );

  const { data: latestRevision, status } = useQuery(
    [
      "getLatestRevision",
      currentProject?.id,
      currentCluster?.id,
      deploymentTarget?.deployment_target_id,
      appName,
    ],
    async () => {
      if (!appParamsExist) {
        return;
      }
      const res = await api.getLatestRevision(
        "<token>",
        {
          deployment_target_id: deploymentTarget.deployment_target_id,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          porter_app_name: appName,
        }
      );

      const revisionData = await z
        .object({
          app_revision: appRevisionValidator,
        })
        .parseAsync(res.data);

      return revisionData.app_revision;
    },
    {
      enabled: appParamsExist,
      refetchInterval: 5000,
    }
  );

  const latestSource: SourceOptions | null = useMemo(() => {
    if (!porterApp) {
      return null;
    }

    if (porterApp.image_repo_uri) {
      const [repository, tag] = porterApp.image_repo_uri.split(":");
      return {
        type: "docker-registry",
        image: {
          repository,
          tag,
        },
      };
    }

    return {
      type: "github",
      git_repo_id: porterApp.git_repo_id ?? 0,
      git_repo_name: porterApp.repo_name ?? "",
      git_branch: porterApp.git_branch ?? "",
      porter_yaml_path: porterApp.porter_yaml_path ?? "./porter.yaml",
    };
  }, [porterApp]);

  const { loading: porterYamlLoading, detectedServices } = usePorterYaml({
    source: latestSource,
    useDefaults: false,
  });

  const latestProto = useMemo(() => {
    if (!latestRevision) {
      return;
    }

    return PorterApp.fromJsonString(atob(latestRevision.b64_app_proto));
  }, [latestRevision]);

  if (
    status === "loading" ||
    porterAppStatus === "loading" ||
    !appParamsExist ||
    porterYamlLoading
  ) {
    return <Loading />;
  }

  if (
    status === "error" ||
    porterAppStatus === "error" ||
    !latestRevision ||
    !latestProto ||
    !porterApp
  ) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No application matching "{appName}" was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/apps">Return to dashboard</Link>
      </Placeholder>
    );
  }

  return (
    <LatestRevisionContext.Provider
      value={{
        latestRevision,
        latestProto,
        porterApp,
        clusterId: currentCluster.id,
        projectId: currentProject.id,
        deploymentTargetId: deploymentTarget.deployment_target_id,
        servicesFromYaml: detectedServices,
      }}
    >
      {children}
    </LatestRevisionContext.Provider>
  );
};

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;
const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;
