import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { PorterApp } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import notFound from "legacy/assets/not-found.png";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type DeploymentTarget } from "legacy/lib/hooks/useDeploymentTarget";
import { usePorterYaml } from "legacy/lib/hooks/usePorterYaml";
import { clientAppFromProto, type SourceOptions } from "legacy/lib/porter-apps";
import {
  deserializeNotifications,
  type ClientNotification,
} from "legacy/lib/porter-apps/notification";
import { formattedPath } from "legacy/lib/porter-apps/routing";
import {
  type ClientService,
  type DetectedServices,
} from "legacy/lib/porter-apps/services";
import {
  appRevisionValidator,
  type AppRevision,
} from "legacy/lib/revisions/types";
import api from "legacy/shared/api";
import { valueExists } from "legacy/shared/util";
import styled from "styled-components";
import { z } from "zod";

import { Context } from "shared/Context";
import { useDeploymentTarget } from "shared/DeploymentTargetContext";

import {
  populatedEnvGroup,
  type PopulatedEnvGroup,
} from "../validate-apply/app-settings/types";
import { porterAppValidator, type PorterAppRecord } from "./AppView";
import {
  porterAppNotificationEventMetadataValidator,
  type PorterAppNotification,
} from "./tabs/activity-feed/events/types";

type LatestRevisionContextType = {
  porterApp: PorterAppRecord;
  latestRevision: AppRevision;
  latestProto: PorterApp;
  latestClientNotifications: ClientNotification[];
  latestSerializedNotifications: PorterAppNotification[];
  servicesFromYaml: DetectedServices | null;
  clusterId: number;
  projectId: number;
  appName: string;
  deploymentTarget: DeploymentTarget & { namespace: string };
  previewRevision: AppRevision | null;
  attachedEnvGroups: PopulatedEnvGroup[];
  appEnv?: PopulatedEnvGroup;
  setPreviewRevision: Dispatch<SetStateAction<AppRevision | null>>;
  latestClientServices: ClientService[];
  loading: boolean;
  latestSource: SourceOptions;
  tabUrlGenerator: ({
    tab,
    queryParams,
  }: {
    tab: string;
    queryParams?: Record<string, string>;
  }) => string;
};

const LatestRevisionContext = createContext<LatestRevisionContextType | null>(
  null
);

export const useLatestRevision = (): LatestRevisionContextType => {
  const context = useContext(LatestRevisionContext);
  if (context == null) {
    throw new Error(
      "useLatestRevision must be used within a LatestRevisionContext"
    );
  }
  return context;
};

type LatestRevisionProviderProps = {
  appName?: string;
  showLoader?: boolean;
  children: JSX.Element;
};

export const LatestRevisionProvider: React.FC<LatestRevisionProviderProps> = ({
  appName,
  showLoader = true,
  children,
}) => {
  const [previewRevision, setPreviewRevision] = useState<AppRevision | null>(
    null
  );
  const { currentCluster, currentProject } = useContext(Context);
  const { currentDeploymentTarget } = useDeploymentTarget();

  const appParamsExist =
    !!appName &&
    !!currentCluster &&
    !!currentProject &&
    !!currentDeploymentTarget;

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

  const { data: { app_revision: latestRevision } = {}, status } = useQuery(
    [
      "getLatestRevision",
      currentProject?.id,
      currentCluster?.id,
      currentDeploymentTarget,
      appName,
    ],
    async () => {
      if (!appParamsExist) {
        return { app_revision: undefined };
      }
      const res = await api.getLatestRevision(
        "<token>",
        {
          deployment_target_id: currentDeploymentTarget.id,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          porter_app_name: appName,
        }
      );

      const { app_revision: appRevision } = await z
        .object({
          app_revision: appRevisionValidator,
        })
        .parseAsync(res.data);
      return {
        app_revision: appRevision,
      };
    },
    {
      enabled: appParamsExist,
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  const { data: { notifications: latestSerializedNotifications = [] } = {} } =
    useQuery(
      [
        "appNotifications",
        currentProject?.id,
        currentCluster?.id,
        currentDeploymentTarget,
        appName,
      ],
      async () => {
        if (!appParamsExist) {
          return { notifications: [] };
        }
        const res = await api.appNotifications(
          "<token>",
          {
            deployment_target_id: currentDeploymentTarget.id,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            porter_app_name: appName,
          }
        );

        const { notifications: porterAppNotifications } = await z
          .object({
            notifications: z.array(porterAppNotificationEventMetadataValidator),
          })
          .parseAsync(res.data);
        return {
          notifications: porterAppNotifications,
        };
      },
      {
        enabled: appParamsExist,
        refetchInterval: 5000,
        refetchOnWindowFocus: false,
      }
    );

  const revisionId = previewRevision?.id ?? latestRevision?.id;
  const { data: { attachedEnvGroups = [], appEnv } = {} } = useQuery(
    ["getAttachedEnvGroups", appName, revisionId],
    async () => {
      if (
        !appName ||
        !revisionId ||
        !currentCluster?.id ||
        !currentProject?.id
      ) {
        return {
          attachedEnvGroups: [],
          appEnv: undefined,
        };
      }

      const res = await api.getAttachedEnvGroups(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          app_name: appName,
          revision_id: revisionId,
        }
      );

      const { env_groups: attachedEnvGroups, app_env: appEnv } = await z
        .object({
          env_groups: z.array(populatedEnvGroup),
          app_env: populatedEnvGroup,
        })
        .parseAsync(res.data);

      return {
        attachedEnvGroups,
        appEnv,
      };
    },
    {
      enabled:
        !!appName && !!revisionId && !!currentCluster && !!currentProject,
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

    if (!porterApp.git_repo_id) {
      return {
        type: "local",
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
    source: latestSource?.type === "github" ? latestSource : null,
    appName,
    useDefaults: false,
  });

  const latestProto = useMemo(() => {
    if (!latestRevision) {
      return;
    }

    return PorterApp.fromJsonString(atob(latestRevision.b64_app_proto), {
      ignoreUnknownFields: true,
    });
  }, [latestRevision]);

  const latestClientServices = useMemo(() => {
    if (!latestProto) {
      return [];
    }
    const app = clientAppFromProto({
      proto: latestProto,
      overrides: detectedServices,
    });
    return [
      ...app.services,
      app.predeploy?.length ? app.predeploy[0] : undefined,
    ].filter(valueExists);
  }, [latestProto, detectedServices]);

  const latestClientNotifications = useMemo(() => {
    if (!latestRevision) {
      return [];
    }

    return deserializeNotifications({
      notifications: latestSerializedNotifications,
      clientServices: latestClientServices,
      revisionId: latestRevision.id,
      isHistorical: false,
    });
  }, [latestSerializedNotifications, latestClientServices, latestRevision]);

  const loading =
    status === "loading" ||
    porterAppStatus === "loading" ||
    !appParamsExist ||
    porterYamlLoading ||
    !latestSource;

  if (loading) {
    if (!showLoader) {
      return null;
    }
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
            No application matching &quot;{appName}&quot; was found.
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
        latestClientNotifications,
        latestSerializedNotifications,
        porterApp,
        clusterId: currentCluster.id,
        projectId: currentProject.id,
        deploymentTarget: currentDeploymentTarget,
        servicesFromYaml: detectedServices,
        attachedEnvGroups,
        appEnv,
        previewRevision,
        setPreviewRevision,
        latestClientServices,
        latestSource,
        appName,
        loading,
        tabUrlGenerator: ({ tab, queryParams }) =>
          formattedPath({
            currentProject,
            deploymentTarget: currentDeploymentTarget,
            appName,
            tab,
            queryParams,
          }),
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
