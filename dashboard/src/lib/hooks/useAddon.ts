import { useEffect, useState } from "react";
import { AddonWithEnvVars } from "@porter-dev/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { z } from "zod";

import {
  clientAddonFromProto,
  clientAddonToProto,
  type ClientAddon,
} from "lib/addons";

import api from "shared/api";
import {
  useWebsockets,
  type NewWebsocketOptions,
} from "shared/hooks/useWebsockets";
import { valueExists } from "shared/util";

import { type DeploymentTarget } from "./useDeploymentTarget";

export const useAddonList = ({
  projectId,
  deploymentTargetId,
}: {
  projectId?: number;
  deploymentTargetId?: string;
}): {
  addons: ClientAddon[];
  isLoading: boolean;
  isError: boolean;
} => {
  const {
    data: addons = [],
    isLoading,
    isError,
  } = useQuery(
    ["listAddons", projectId, deploymentTargetId],
    async () => {
      if (!projectId || projectId === -1 || !deploymentTargetId) {
        return;
      }

      const res = await api.listAddons(
        "<token>",
        {},
        {
          projectId,
          deploymentTargetId,
        }
      );

      const parsed = await z
        .object({
          base64_addons: z.array(z.string()),
        })
        .parseAsync(res.data);

      const clientAddons: ClientAddon[] = parsed.base64_addons
        .map((a) => {
          const proto = AddonWithEnvVars.fromJsonString(atob(a), {
            ignoreUnknownFields: true,
          });
          if (!proto.addon) {
            return null;
          }
          return clientAddonFromProto({
            addon: proto.addon,
          });
        })
        .filter(valueExists);

      return clientAddons;
    },
    {
      enabled: !!projectId && projectId !== -1 && !!deploymentTargetId,
      refetchOnWindowFocus: false,
      refetchInterval: 5000,
    }
  );

  return {
    addons,
    isLoading,
    isError,
  };
};

export const useAddon = (): {
  updateAddon: ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }) => Promise<void>;
} => {
  const updateAddon = async ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }): Promise<void> => {
    const proto = clientAddonToProto(addon);

    await api.updateAddon(
      "<token>",
      {
        b64_addon: btoa(proto.toJsonString({ emitDefaultValues: true })),
      },
      {
        projectId,
        deploymentTargetId,
      }
    );
  };

  return {
    updateAddon,
  };
};

export type ClientAddonPod = {
  name: string;
  status: "running" | "pending" | "failed";
};
export type ClientAddonStatus = {
  pods: ClientAddonPod[];
  isLoading: boolean;
};
export const useAddonStatus = ({
  projectId,
  deploymentTarget,
  addon,
}: {
  projectId?: number;
  deploymentTarget: DeploymentTarget;
  addon?: ClientAddon;
}): ClientAddonStatus => {
  const [isInitializingStatus, setIsInitializingStatus] =
    useState<boolean>(false);
  const [controllerPodMap, setControllerPodMap] = useState<
    Record<string, ClientAddonPod[]>
  >({});

  const { newWebsocket, openWebsocket, closeAllWebsockets, closeWebsocket } =
    useWebsockets();

  const controllersResp = useQuery(
    ["listControllers", projectId, addon],
    async () => {
      if (!projectId || projectId === -1 || !addon) {
        return;
      }

      const resp = await api.getChartControllers(
        "<token>",
        {},
        {
          name: addon.name.value,
          namespace: deploymentTarget.namespace,
          cluster_id: deploymentTarget.cluster_id,
          revision: 0,
          id: projectId,
        }
      );
      const parsed = await z
        .array(
          z.object({
            metadata: z.object({
              uid: z.string(),
            }),
            spec: z.object({
              selector: z.object({
                matchLabels: z.record(z.string()),
              }),
            }),
          })
        )
        .parseAsync(resp.data);

      return parsed;
    },
    {
      enabled: !!projectId && projectId !== -1 && !!addon,
      retryDelay: 5000,
    }
  );

  useEffect(() => {
    setIsInitializingStatus(true);
    if (!controllersResp.isSuccess || !controllersResp.data) {
      return;
    }

    const setupPodWebsocketWithSelectors = (
      controllerUid: string,
      selectors: string
    ): void => {
      if (!projectId || projectId === -1 || !deploymentTarget) {
        return;
      }
      const websocketKey = `${Math.random().toString(36).substring(2, 15)}`;
      const apiEndpoint = `/api/projects/${projectId}/clusters/${deploymentTarget.cluster_id}/pod/status?selectors=${selectors}`;

      const options: NewWebsocketOptions = {
        onopen: () => {
          // console.log("connected to websocket for selectors: ", selectors);
        },
        onmessage: (evt: MessageEvent) => {
          const event = JSON.parse(evt.data);
          const object = event.Object;
          object.metadata.kind = event.Kind;

          void updatePodsForController(controllerUid, selectors);
        },
        onclose: () => {
          // console.log("closing websocket");
        },
        onerror: () => {
          // console.log(err);
          closeWebsocket(websocketKey);
        },
      };

      newWebsocket(websocketKey, apiEndpoint, options);
      openWebsocket(websocketKey);
    };

    const controllers = controllersResp.data;

    const initializeControllers = async (): Promise<void> => {
      try {
        // this initializes the controllerPodMap on mount
        const controllerPodMap: Record<string, ClientAddonPod[]> = {};
        for (const controller of controllers) {
          const selectors = Object.keys(
            controller.spec.selector.matchLabels
          ).map((key) => `${key}=${controller.spec.selector.matchLabels[key]}`);
          const pods = await getPodsForSelectors(selectors.join(","));
          controllerPodMap[controller.metadata.uid] = pods;
        }
        setControllerPodMap(controllerPodMap);

        // this sets up websockets for each controller, for pod updates
        for (const controller of controllers) {
          const selectors = Object.keys(
            controller.spec.selector.matchLabels
          ).map((key) => `${key}=${controller.spec.selector.matchLabels[key]}`);
          setupPodWebsocketWithSelectors(
            controller.metadata.uid,
            selectors.join(",")
          );
        }
      } catch (err) {
        // TODO: handle error
      } finally {
        setIsInitializingStatus(false);
      }
    };

    void initializeControllers();
  }, [controllersResp.data]);

  const getPodsForSelectors = async (
    selectors: string
  ): Promise<ClientAddonPod[]> => {
    if (!projectId || projectId === -1 || !deploymentTarget) {
      return [];
    }
    try {
      const res = await api.getMatchingPods(
        "<token>",
        {
          namespace: deploymentTarget.namespace,
          selectors: [selectors],
        },
        {
          id: projectId,
          cluster_id: deploymentTarget.cluster_id,
        }
      );
      const parsed = z
        .array(
          z.object({
            metadata: z.object({
              name: z.string(),
            }),
            status: z.object({
              phase: z
                .string()
                .pipe(
                  z
                    .enum(["UNKNOWN", "Running", "Pending", "Failed"])
                    .catch("UNKNOWN")
                ),
            }),
          })
        )
        .safeParse(res.data);
      if (!parsed.success) {
        // console.log(parsed.error);
        return [];
      }
      const clientPods: ClientAddonPod[] = parsed.data
        .map((pod) => {
          if (pod.status.phase === "UNKNOWN") {
            return undefined;
          }

          return {
            name: pod.metadata.name,
            status: match(pod.status.phase)
              .with("Running", () => "running" as const)
              .with("Pending", () => "pending" as const)
              .with("Failed", () => "failed" as const)
              .exhaustive(),
          };
        })
        .filter(valueExists);

      return clientPods;
    } catch (err) {
      return [];
    }
  };

  const updatePodsForController = async (
    controllerUid: string,
    selectors: string
  ): Promise<void> => {
    const pods = await getPodsForSelectors(selectors);

    setControllerPodMap((prev) => {
      return {
        ...prev,
        [controllerUid]: pods,
      };
    });
  };

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  return {
    pods: Object.keys(controllerPodMap)
      .map((c) => controllerPodMap[c])
      .flat(),
    isLoading: isInitializingStatus,
  };
};
