import { useEffect, useState } from "react";
import _ from "lodash";
import pluralize from "pluralize";
import z from "zod";

import api from "shared/api";
import {
  useWebsockets,
  type NewWebsocketOptions,
} from "shared/hooks/useWebsockets";
import { valueExists } from "shared/util";

export type ClientServiceStatus = {
  status: "running" | "spinningDown" | "failing";
  message: string;
  crashLoopReason: string;
  restartCount?: number;
  revisionId: string;
};

const serviceStatusValidator = z.object({
  service_name: z.string(),
  revision_status_list: z.array(
    z.object({
      revision_id: z.string(),
      revision_number: z.number(),
      instance_status_list: z.array(
        z.object({
          status: z.union([
            z.literal("PENDING"),
            z.literal("RUNNING"),
            z.literal("FAILED"),
          ]),
          restart_count: z.number(),
          creation_timestamp: z.string(),
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
}): { serviceVersionStatus: Record<string, ClientServiceStatus[]> } => {
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
  ): ClientServiceStatus[] => {
    return serviceStatus.revision_status_list
      .sort((a, b) => b.revision_number - a.revision_number)
      .flatMap((revisionStatus) => {
        const instancesByStatus = _.groupBy(
          revisionStatus.instance_status_list,
          (instance) => instance.status
        );
        const runningInstances = instancesByStatus.RUNNING || [];
        const pendingInstances = instancesByStatus.PENDING || [];
        const failedInstances = instancesByStatus.FAILED || [];
        const versionStatuses: ClientServiceStatus[] = [];

        if (runningInstances.length > 0) {
          versionStatuses.push({
            status: "running",
            message: `${runningInstances.length} ${pluralize(
              "instance",
              runningInstances.length
            )} ${pluralize("is", runningInstances.length)} running at Version ${
              revisionStatus.revision_number
            }`,
            crashLoopReason: "",
            restartCount: _.maxBy(runningInstances, "restart_count")
              ?.restart_count,
            revisionId: revisionStatus.revision_id,
          });
        }
        if (pendingInstances.length > 0) {
          versionStatuses.push({
            status: "spinningDown",
            message: `${pendingInstances.length} ${pluralize(
              "instance",
              pendingInstances.length
            )} ${pluralize(
              "is",
              pendingInstances.length
            )} in a pending state at Version ${revisionStatus.revision_number}`,
            crashLoopReason: "",
            restartCount: _.maxBy(pendingInstances, "restart_count")
              ?.restart_count,
            revisionId: revisionStatus.revision_id,
          });
        }
        if (failedInstances.length > 0) {
          versionStatuses.push({
            status: "failing",
            message: `${failedInstances.length} ${pluralize(
              "instance",
              failedInstances.length
            )} ${pluralize(
              "is",
              failedInstances.length
            )} failing to run Version ${revisionStatus.revision_number}`,
            crashLoopReason: "",
            restartCount: _.maxBy(failedInstances, "restart_count")
              ?.restart_count,
            revisionId: revisionStatus.revision_id,
          });
        }
        return versionStatuses;
      })
      .filter(valueExists);
  };

  return {
    serviceVersionStatus: _.mapValues(
      serviceStatusMap,
      deserializeServiceStatus
    ),
  };
};
