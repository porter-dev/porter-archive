import { useEffect, useRef, useState } from "react";
import { Addon, AddonWithEnvVars } from "@porter-dev/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Anser, { type AnserJsonEntry } from "anser";
import { match } from "ts-pattern";
import { z } from "zod";

import {
  clientAddonFromProto,
  clientAddonToProto,
  legacyAddonValidator,
  type ClientAddon,
  type LegacyClientAddon,
} from "lib/addons";

import api from "shared/api";
import {
  useWebsockets,
  type NewWebsocketOptions,
} from "shared/hooks/useWebsockets";
import { isJSON, valueExists } from "shared/util";

import { type DeploymentTarget } from "./useDeploymentTarget";

export const useAddonList = ({
  projectId,
  deploymentTarget,
}: {
  projectId?: number;
  deploymentTarget?: DeploymentTarget;
}): {
  addons: ClientAddon[];
  legacyAddons: LegacyClientAddon[];
  isLoading: boolean;
  isLegacyAddonsLoading: boolean;
  isError: boolean;
} => {
  const {
    data: addons = [],
    isLoading,
    isError,
  } = useQuery(
    ["listAddons", projectId, deploymentTarget],
    async () => {
      if (!projectId || projectId === -1 || !deploymentTarget) {
        return;
      }

      const res = await api.listAddons(
        "<token>",
        {},
        {
          projectId,
          deploymentTargetId: deploymentTarget.id,
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
      enabled: !!projectId && projectId !== -1 && !!deploymentTarget,
      refetchOnWindowFocus: false,
      refetchInterval: 5000,
    }
  );

  const { data: legacyAddons = [], isLoading: isLegacyAddonsLoading } =
    useQuery(
      ["listLegacyAddons", projectId, deploymentTarget],
      async () => {
        if (!projectId || projectId === -1 || !deploymentTarget) {
          return;
        }

        const res = await api.getCharts(
          "<token>",
          {
            limit: 50,
            skip: 0,
            byDate: false,
            statusFilter: [
              "deployed",
              "uninstalled",
              "pending",
              "pending-install",
              "pending-upgrade",
              "pending-rollback",
              "failed",
            ],
          },
          {
            id: projectId,
            cluster_id: deploymentTarget.cluster_id,
            namespace: "all",
          }
        );

        const parsed = await z.array(legacyAddonValidator).parseAsync(res.data);

        return parsed
          .filter((a) => {
            return ![
              "web",
              "worker",
              "job",
              "umbrella",
              "postgresql-managed", // managed in datastores tab
              "redis-managed", // managed in datastores tab
            ].includes(a.chart?.metadata?.name ?? "");
          })
          .filter((a) => {
            return ![
              "ack-system",
              "cert-manager",
              "ingress-nginx",
              "kube-node-lease",
              "kube-public",
              "kube-system",
              "monitoring",
              "porter-agent-system",
              "external-secrets",
              "infisical",
            ].includes(a.namespace ?? "");
          });
      },
      {
        enabled: !!projectId && projectId !== -1 && !!deploymentTarget,
        refetchOnWindowFocus: false,
        refetchInterval: 5000,
      }
    );

  return {
    addons,
    legacyAddons,
    isLoading,
    isLegacyAddonsLoading,
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
  deleteAddon: ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }) => Promise<void>;
  getAddon: ({
    projectId,
    deploymentTargetId,
    addonName,
    refreshIntervalSeconds,
  }: {
    projectId?: number;
    deploymentTargetId: string;
    addonName?: string;
    refreshIntervalSeconds?: number;
  }) => {
    addon: ClientAddon | undefined;
    isLoading: boolean;
    isError: boolean;
  };
} => {
  const queryClient = useQueryClient();

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

  const deleteAddon = async ({
    projectId,
    deploymentTargetId,
    addon,
  }: {
    projectId: number;
    deploymentTargetId: string;
    addon: ClientAddon;
  }): Promise<void> => {
    await api.deleteAddon(
      "<token>",
      {},
      {
        projectId,
        deploymentTargetId,
        addonName: addon.name.value,
      }
    );

    await queryClient.invalidateQueries(["listAddons"]);
  };

  const getAddon = ({
    projectId,
    deploymentTargetId,
    addonName,
    refreshIntervalSeconds = 0,
  }: {
    projectId?: number;
    deploymentTargetId: string;
    addonName?: string;
    refreshIntervalSeconds?: number;
  }): {
    addon: ClientAddon | undefined;
    isLoading: boolean;
    isError: boolean;
  } => {
    const { data, isLoading, isError } = useQuery(
      ["getAddon", projectId, deploymentTargetId, addonName],
      async () => {
        if (!projectId || projectId === -1 || !addonName) {
          return undefined;
        }

        const res = await api.getAddon(
          "<token>",
          {},
          {
            projectId,
            deploymentTargetId,
            addonName,
          }
        );

        const parsed = await z
          .object({
            addon: z.string(),
          })
          .parseAsync(res.data);

        const proto = Addon.fromJsonString(atob(parsed.addon), {
          ignoreUnknownFields: true,
        });

        if (!proto) {
          return undefined;
        }

        return clientAddonFromProto({
          addon: proto,
        });
      },
      {
        enabled: !!projectId && projectId !== -1 && !!addonName,
        retryDelay: 5000,
        refetchInterval: refreshIntervalSeconds * 1000,
      }
    );

    return {
      addon: data,
      isLoading,
      isError,
    };
  };

  return {
    updateAddon,
    deleteAddon,
    getAddon,
  };
};

const addonControllersValidator = z.array(
  z.object({
    metadata: z.object({
      uid: z.string(),
      name: z.string(),
    }),
    spec: z.object({
      selector: z.object({
        matchLabels: z.record(z.string()),
      }),
    }),
  })
);
const addonPodValidator = z.object({
  metadata: z.object({
    name: z.string(),
  }),
  status: z.object({
    phase: z
      .string()
      .pipe(
        z.enum(["UNKNOWN", "Running", "Pending", "Failed"]).catch("UNKNOWN")
      ),
  }),
});
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
      const parsed = await addonControllersValidator.parseAsync(resp.data);

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
      const parsed = z.array(addonPodValidator).safeParse(res.data);
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

export type Log = {
  line: AnserJsonEntry[];
  lineNumber: number;
  timestamp?: string;
  controllerName: string;
  podName: string;
};

export const useAddonLogs = ({
  projectId,
  deploymentTarget,
  addon,
}: {
  projectId?: number;
  deploymentTarget: DeploymentTarget;
  addon?: ClientAddon;
}): { logs: Log[]; refresh: () => Promise<void>; isInitializing: boolean } => {
  const [logs, setLogs] = useState<Log[]>([]);
  const logsBufferRef = useRef<Log[]>([]);
  const { newWebsocket, openWebsocket, closeAllWebsockets } = useWebsockets();
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const fetchControllers = async (): Promise<
    z.infer<typeof addonControllersValidator>
  > => {
    if (!projectId || projectId === -1 || !addon) {
      throw new Error("Invalid parameters");
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
    const parsed = await addonControllersValidator.parseAsync(resp.data);

    return parsed;
  };

  const controllersQuery = useQuery(
    ["listControllers", projectId, addon],
    fetchControllers,
    {
      retryDelay: 5000,
      enabled: !!projectId && projectId !== -1 && !!addon,
    }
  );

  useEffect(() => {
    const fetchPodsAndSetUpWebsockets = async (
      controllers: z.infer<typeof addonControllersValidator>
    ): Promise<void> => {
      closeAllWebsockets();
      for (const controller of controllers) {
        const selectors = Object.keys(controller.spec.selector.matchLabels)
          .map((key) => `${key}=${controller.spec.selector.matchLabels[key]}`)
          .join(",");

        const pods = await fetchPodsForSelectors(selectors);

        for (const pod of pods) {
          setupWebsocket(pod.metadata.name, controller.metadata.name);
        }
      }
      setIsInitializing(false);
    };
    if (controllersQuery.isSuccess && controllersQuery.data) {
      void fetchPodsAndSetUpWebsockets(controllersQuery.data);
    }
  }, [controllersQuery.data, controllersQuery.isSuccess]);

  const fetchPodsForSelectors = async (
    selectors: string
  ): Promise<Array<z.infer<typeof addonPodValidator>>> => {
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
      const parsed = await z.array(addonPodValidator).parseAsync(res.data);
      return parsed;
    } catch (err) {
      return [];
    }
  };

  const parseLogs = (
    logs: string[] = [],
    controllerName: string,
    podName: string
  ): Log[] => {
    return logs.filter(Boolean).map((logLine: string, idx) => {
      try {
        if (!isJSON(logLine)) {
          return {
            line: Anser.ansiToJson(logLine),
            lineNumber: idx + 1,
            timestamp: undefined,
            controllerName,
            podName,
          };
        }

        const parsedLine = JSON.parse(logLine);
        const ansiLog = Anser.ansiToJson(parsedLine.line);
        return {
          line: ansiLog,
          lineNumber: idx + 1,
          timestamp: parsedLine.timestamp,
          controllerName,
          podName,
        };
      } catch (err) {
        // console.error(err, logLine);
        return {
          line: Anser.ansiToJson(logLine),
          lineNumber: idx + 1,
          timestamp: undefined,
          controllerName,
          podName,
        };
      }
    });
  };

  const updateLogs = (newLogs: Log[]): void => {
    if (!newLogs.length) {
      return;
    }

    setLogs((logs) => {
      const updatedLogs = [...logs, ...newLogs];
      updatedLogs.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        return a.lineNumber - b.lineNumber;
      });

      return updatedLogs;
    });
  };

  const flushLogsBuffer = (): void => {
    updateLogs(logsBufferRef.current ?? []);
    logsBufferRef.current = [];
  };

  const pushLogs = (newLogs: Log[]): void => {
    logsBufferRef.current.push(...newLogs);
  };

  const setupWebsocket = (podName: string, controllerName: string): void => {
    if (!projectId || projectId === -1 || !deploymentTarget || !addon) {
      return;
    }

    const websocketKey = `${Math.random().toString(36).substring(2, 15)}`;
    const params = new URLSearchParams({
      pod_selector: podName,
      namespace: deploymentTarget.namespace,
    });

    const apiEndpoint = `/api/projects/${projectId}/clusters/${
      deploymentTarget.cluster_id
    }/namespaces/${deploymentTarget.namespace}/logs/loki?${params.toString()}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        // console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        if (!evt?.data || typeof evt.data !== "string") {
          return;
        }
        const newLogs = parseLogs(
          evt.data.trim().split("\n"),
          controllerName,
          podName
        );
        pushLogs(newLogs);
      },
      onclose: () => {
        // console.log("Closed websocket:", websocketKey);
      },
    };

    newWebsocket(websocketKey, apiEndpoint, config);
    openWebsocket(websocketKey);
  };

  const refresh = async (): Promise<void> => {
    if (!projectId || projectId === -1 || !addon || !deploymentTarget) {
      return;
    }
    setLogs([]);
    flushLogsBuffer();
    setIsInitializing(true);
    await controllersQuery.refetch();
  };

  useEffect(() => {
    setTimeout(flushLogsBuffer, 500);
    const flushLogsBufferInterval = setInterval(flushLogsBuffer, 3000);
    return () => {
      clearInterval(flushLogsBufferInterval);
    };
  }, []);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  return {
    logs,
    refresh,
    isInitializing,
  };
};
