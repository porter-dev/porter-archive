import Anser from "anser";
import dayjs from "dayjs";
import _ from "lodash";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";
import { SelectedPodType } from "./types";

const MAX_LOGS = 250;

const ANSI_RESET = "\u001B[0m";
const ANSI_YELLOW_BACKGROUND = "\u001b[43m";
const ANSI_BLUE = "\u001B[34m";
const ANSI_RED = "\u001b[31m";
const ANSI_GREEN = "\u001b[32m";
const ANSI_PURPLE = "\u001B[35m";

export const useLogs = (
  currentPod: SelectedPodType,
  scroll?: (smooth: boolean) => void
) => {
  const currentPodName = useRef<string>();

  const { currentCluster, currentProject } = useContext(Context);
  const [containers, setContainers] = useState<string[]>([]);
  const [currentContainer, setCurrentContainer] = useState<string>("");
  const [logs, setLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const [prevLogs, setPrevLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    getWebsocket,
    closeWebsocket,
  } = useWebsockets();

  const getSystemLogs = async () => {
    if (!currentPod?.metadata?.name || !currentPod?.metadata?.namespace) {
      return;
    }

    const events = await api
      .getPodEvents(
        "<token>",
        {},
        {
          name: currentPod.metadata.name,
          namespace: currentPod.metadata.namespace,
          cluster_id: currentCluster?.id,
          id: currentProject?.id,
        }
      )
      .then((res) => res.data);

    const processedLogs: Anser.AnserJsonEntry[][] = _.sortBy(events.items, [
      "lastTimestamp",
    ])
      .map((evt: any) => {
        const ansiEvtType = evt.type == "Warning" ? ANSI_RED : ANSI_GREEN;
        const ansiLog = Anser.ansiToJson(
          `${dayjs(evt.lastTimestamp).format("hh:mm:ss A")} \t ${ansiEvtType}${
            evt.type
          }${ANSI_RESET} \t ${ANSI_PURPLE}Count:${
            evt.count
          } \t ${ANSI_YELLOW_BACKGROUND}${ANSI_BLUE}\t${
            evt.reason
          } ${ANSI_RESET} \t ${evt.message}`
        );
        return ansiLog;
      });

    // SET LOGS FOR SYSTEM
    setLogs((prevState) => ({
      ...prevState,
      system: processedLogs,
    }));
  };

  const getContainerPreviousLogs = async (containerName: string) => {
    try {
      const logs = await api
        .getPreviousLogsForContainer<{ previous_logs: string[] }>(
          "<token>",
          {
            container_name: containerName,
          },
          {
            pod_name: currentPod?.metadata?.name,
            namespace: currentPod?.metadata?.namespace,
            cluster_id: currentCluster?.id,
            project_id: currentProject?.id,
          }
        )
        .then((res) => res.data);
      // Process logs
      const processedLogs: Anser.AnserJsonEntry[][] = logs.previous_logs.map(
        (currentLog) => {
          let ansiLog = Anser.ansiToJson(currentLog);
          return ansiLog;
        }
      );

      setPrevLogs((pl) => ({
        ...pl,
        [containerName]: processedLogs,
      }));
    } catch (error) {}
  };

  const setupWebsocket = (containerName: string, websocketKey: string) => {
    if (!currentPod?.metadata?.name) return;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${currentPod?.metadata?.namespace}/pod/${currentPod?.metadata?.name}/logs?container_name=${containerName}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        let ansiLog = Anser.ansiToJson(evt.data);
        setLogs((logs) => {
          const tmpLogs = { ...logs };
          let containerLogs = tmpLogs[containerName] || [];

          containerLogs.push(ansiLog);
          // this is technically not as efficient as things could be
          // if there are performance issues, a deque can be used in place of a list
          // for storing logs
          if (containerLogs.length > MAX_LOGS) {
            containerLogs.shift();
          }
          if (typeof scroll === "function") {
            scroll(true);
          }
          return {
            ...logs,
            [containerName]: containerLogs,
          };
        });
      },
      onclose: () => {
        console.log("Closed websocket:", websocketKey);
      },
    };

    newWebsocket(websocketKey, endpoint, config);
    openWebsocket(websocketKey);
  };

  const refresh = () => {
    const websocketKey = `${currentPodName.current}-${currentContainer}-websocket`;
    closeWebsocket(websocketKey);

    setPrevLogs((prev) => ({ ...prev, [currentContainer]: [] }));
    setLogs((prev) => ({ ...prev, [currentContainer]: [] }));

    if (!Array.isArray(containers)) {
      return;
    }

    if (currentContainer === "system") {
      getSystemLogs();
    } else {
      getContainerPreviousLogs(currentContainer);
      setupWebsocket(currentContainer, websocketKey);
    }
  };

  useEffect(() => {
    // console.log("Selected pod updated");
    if (currentPod?.metadata?.name === currentPodName.current) {
      return () => {};
    }
    currentPodName.current = currentPod?.metadata?.name;
    const currentContainers =
      currentPod?.spec?.containers?.map((container) => container?.name) || [];

    setContainers(currentContainers);
    setCurrentContainer(currentContainers[0]);
  }, [currentPod]);

  // Retrieve all previous logs for containers
  useEffect(() => {
    if (!Array.isArray(containers)) {
      return;
    }

    closeAllWebsockets();

    setPrevLogs({});
    setLogs({});

    getSystemLogs();
    containers.forEach((containerName) => {
      const websocketKey = `${currentPodName.current}-${containerName}-websocket`;

      getContainerPreviousLogs(containerName);

      if (!getWebsocket(websocketKey)) {
        setupWebsocket(containerName, websocketKey);
      }
    });

    return () => {
      closeAllWebsockets();
    };
  }, [containers]);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  const currentLogs = useMemo(() => {
    return logs[currentContainer] || [];
  }, [currentContainer, logs]);

  const currentPreviousLogs = useMemo(() => {
    return prevLogs[currentContainer] || [];
  }, [currentContainer, prevLogs]);

  return {
    containers,
    currentContainer,
    setCurrentContainer,
    logs: currentLogs,
    previousLogs: currentPreviousLogs,
    refresh,
  };
};
