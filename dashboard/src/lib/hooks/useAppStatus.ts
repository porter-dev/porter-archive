import { useEffect, useState } from "react";
import _ from "lodash";
import { match } from "ts-pattern";
import z from "zod";

import api from "shared/api";
import {
  useWebsockets,
  type NewWebsocketOptions,
} from "shared/hooks/useWebsockets";

export type ServiceStatusDescriptor =
  | "running"
  | "pending"
  | "failing"
  | "unknown";

export type ClientServiceStatus = {
  status: ServiceStatusDescriptor;
  serviceName: string;
  versionStatusList: ClientServiceVersionStatus[];
};

export type ClientServiceVersionStatus = {
  status: ServiceStatusDescriptor;
  revisionId: string;
  revisionNumber: number;
  instanceStatusList: ClientServiceVersionInstanceStatus[];
};

export type ClientServiceVersionInstanceStatus = {
  status: ServiceStatusDescriptor;
  message: string;
  crashLoopReason: string;
  restartCount: number;
  name: string;
  creationTimestamp: string;
};

const serviceStatusValidator = z.object({
  service_name: z.string(),
  revision_status_list: z.array(
    z.object({
      revision_id: z.string(),
      revision_number: z.number(),
      instance_status_list: z.array(
        z.object({
          status: z.enum(["PENDING", "RUNNING", "FAILED"]),
          restart_count: z.number(),
          creation_timestamp: z.string(),
          name: z.string(),
        })
      ),
    })
  ),
});
type SerializedServiceStatus = z.infer<typeof serviceStatusValidator>;

export const useAppStatus = ({
  projectId,
  clusterId,
  serviceNames,
  deploymentTargetId,
  appName,
  kind = "pod",
}: {
  projectId: number;
  clusterId: number;
  serviceNames: string[];
  deploymentTargetId: string;
  appName: string;
  kind?: string;
}): {
  appServiceStatus: Record<string, ClientServiceStatus>;
} => {
  const [serviceStatusMap, setServiceStatusMap] = useState<
    Record<string, SerializedServiceStatus>
  >({});

  const { newWebsocket, openWebsocket, closeAllWebsockets, closeWebsocket } =
    useWebsockets();

  const setupWebsocket = (serviceName: string): void => {
    const selectors = `porter.run/service-name=${serviceName},porter.run/deployment-target-id=${deploymentTargetId}`;
    const apiEndpoint = `/api/projects/${projectId}/clusters/${clusterId}/apps/${kind}/status?selectors=${selectors}`;
    const websocketKey = `${serviceName}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    const options: NewWebsocketOptions = {};
    options.onopen = () => {
      // console.log("opening status websocket for service: " + serviceName)
    };

    options.onmessage = async () => {
      void updatePods(serviceName);
    };

    options.onclose = () => {
      // console.log("closing status websocket for service: " + serviceName)
    };

    options.onerror = () => {
      closeWebsocket(websocketKey);
    };

    newWebsocket(websocketKey, apiEndpoint, options);
    openWebsocket(websocketKey);
  };

  const updatePods = async (serviceName: string): Promise<void> => {
    try {
      const res = await api.appServiceStatus(
        "<token>",
        {
          deployment_target_id: deploymentTargetId,
          service: serviceName,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          app_name: appName,
        }
      );

      const data = await z
        .object({ status: serviceStatusValidator })
        .parseAsync(res.data);
      setServiceStatusMap((prevState) => ({
        ...prevState,
        [serviceName]: data.status,
      }));
    } catch (error) {}
  };

  useEffect(() => {
    void Promise.all(serviceNames.map(updatePods));
    for (const serviceName of serviceNames) {
      setupWebsocket(serviceName);
    }
    return () => {
      closeAllWebsockets();
    };
  }, [projectId, clusterId, deploymentTargetId, appName]);

  const deserializeServiceStatus = (
    serviceStatus: SerializedServiceStatus
  ): ClientServiceStatus => {
    const clientServiceStatus: ClientServiceStatus = {
      status: "unknown",
      serviceName: serviceStatus.service_name,
      versionStatusList: [],
    };

    const versionStatusList = serviceStatus.revision_status_list
      .sort((a, b) => b.revision_number - a.revision_number)
      .map((revisionStatus) => {
        const clientServiceVersionStatus: ClientServiceVersionStatus = {
          status: "unknown",
          revisionId: revisionStatus.revision_id,
          revisionNumber: revisionStatus.revision_number,
          instanceStatusList: [],
        };

        const instanceStatusList = revisionStatus.instance_status_list
          .sort((a, b) => {
            const aDate = new Date(a.creation_timestamp);
            const bDate = new Date(b.creation_timestamp);
            return bDate.getTime() - aDate.getTime();
          })
          .map((instanceStatus) => {
            const status: ServiceStatusDescriptor = match(instanceStatus.status)
              .with("PENDING", () => "pending" as const)
              .with("RUNNING", () => "running" as const)
              .with("FAILED", () => "failing" as const)
              .otherwise(() => "unknown" as const);
            const clientServiceVersionInstanceStatus: ClientServiceVersionInstanceStatus =
              {
                status,
                message: "",
                crashLoopReason: "",
                restartCount: instanceStatus.restart_count,
                name: instanceStatus.name,
                creationTimestamp: instanceStatus.creation_timestamp,
              };

            if (instanceStatus.status === "PENDING") {
              clientServiceVersionInstanceStatus.message = `Instance is pending at Version ${revisionStatus.revision_number}`;
            } else if (instanceStatus.status === "RUNNING") {
              clientServiceVersionInstanceStatus.message = `Instance is running at Version ${revisionStatus.revision_number}`;
            } else if (instanceStatus.status === "FAILED") {
              clientServiceVersionInstanceStatus.message = `Instance is failing at Version ${revisionStatus.revision_number}`;
            }

            return clientServiceVersionInstanceStatus;
          });

        clientServiceVersionStatus.instanceStatusList = instanceStatusList;
        if (
          instanceStatusList.every((instance) => instance.status === "running")
        ) {
          clientServiceVersionStatus.status = "running";
        }
        if (
          instanceStatusList.every((instance) => instance.status === "pending")
        ) {
          clientServiceVersionStatus.status = "pending";
        }
        if (
          instanceStatusList.every((instance) => instance.status === "failing")
        ) {
          clientServiceVersionStatus.status = "failing";
        }

        return clientServiceVersionStatus;
      });

    clientServiceStatus.versionStatusList = versionStatusList;
    if (versionStatusList.every((version) => version.status === "running")) {
      clientServiceStatus.status = "running";
    }
    if (versionStatusList.every((version) => version.status === "pending")) {
      clientServiceStatus.status = "pending";
    }
    if (versionStatusList.every((version) => version.status === "failing")) {
      clientServiceStatus.status = "failing";
    }
    return clientServiceStatus;
  };

  return {
    appServiceStatus: _.mapValues(serviceStatusMap, deserializeServiceStatus),
  };
};

export const statusColor = (status: ServiceStatusDescriptor): string => {
  return match(status)
    .with("running", () => "#38a88a")
    .with("failing", () => "#ff0000")
    .with("pending", () => "#FFA500")
    .with("unknown", () => "#4797ff")
    .exhaustive();
};

export const statusColorLight = (status: ServiceStatusDescriptor): string => {
  return match(status)
    .with("running", () => "#4b6850")
    .with("failing", () => "#FF7F7F")
    .with("pending", () => "#FFC04C")
    .with("unknown", () => "#e6f2ff")
    .exhaustive();
};
