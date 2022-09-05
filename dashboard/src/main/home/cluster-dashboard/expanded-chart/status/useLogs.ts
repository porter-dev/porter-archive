import Anser from "anser";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";
import { SelectedPodType } from "./types";

const MAX_LOGS = 5000;
const LOGS_BUFFER_SIZE = 1000;

interface Log {
  line: Anser.AnserJsonEntry[];
  lineNumber: number;
}

export const useLogs = (
  currentPod: SelectedPodType,
  scroll?: (smooth: boolean) => void
) => {
  let logsBufferRef = useRef<Record<string, Log[]>>({});
  const currentPodName = useRef<string>();

  const { currentCluster, currentProject } = useContext(Context);
  const [containers, setContainers] = useState<string[]>([]);
  const [currentContainer, setCurrentContainer] = useState<string>("");
  const [logs, setLogs] = useState<{
    [key: string]: Log[];
  }>({});
  const [prevLogs, setPrevLogs] = useState<{
    [key: string]: Log[];
  }>({});

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    getWebsocket,
    closeWebsocket,
  } = useWebsockets();

  const getSystemLogs = async () => {
    const events = await api
      .getPodEvents(
        "<token>",
        {},
        {
          name: currentPod?.metadata?.name,
          namespace: currentPod?.metadata?.namespace,
          cluster_id: currentCluster?.id,
          id: currentProject?.id,
        }
      )
      .then((res) => res.data);

    const processedLogs: Log[] = events.items.map((evt: any, idx: number) => {
      let ansiEvtType = evt.type == "Warning" ? "\u001b[31m" : "\u001b[32m";
      let ansiLog = Anser.ansiToJson(
        `${ansiEvtType}${evt.type}\u001b[0m \t \u001b[43m\u001b[34m\t${evt.reason} \u001b[0m \t ${evt.message}`
      );

      return {
        line: ansiLog,
        lineNumber: idx + 1,
      };
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
      const processedLogs: Log[] = logs.previous_logs.map((currentLog, idx) => {
        let ansiLog = Anser.ansiToJson(currentLog);
        return {
          line: ansiLog,
          lineNumber: idx + 1,
        };
      });

      setPrevLogs((pl) => ({
        ...pl,
        [containerName]: processedLogs,
      }));
    } catch (error) {}
  };

  /**
   * Updates the `logs` for `containerName` with `newLogs`
   * @param containerName Name of the container
   * @param newLogs New logs to update for
   */
  const updateContainerLogs = (containerName: string, newLogs: Log[]) => {
    setLogs((logs) => {
      let containerLogs = logs[containerName] || [];
      const lastLineNumber = containerLogs?.at(-1)?.lineNumber || 0;

      containerLogs.push(
        ...newLogs.map((l) => ({
          ...l,
          lineNumber: lastLineNumber + l.lineNumber,
        }))
      );
      // this is technically not as efficient as things could be
      // if there are performance issues, a deque can be used in place of a list
      // for storing logs
      if (containerLogs.length > MAX_LOGS) {
        const logsToBeRemoved =
          newLogs.length < LOGS_BUFFER_SIZE ? newLogs.length : LOGS_BUFFER_SIZE;
        containerLogs = containerLogs.slice(logsToBeRemoved);
      }

      if (typeof scroll === "function") {
        scroll(true);
      }
      return {
        ...logs,
        [containerName]: containerLogs,
      };
    });
  };

  /**
   * Flushes the logs buffer. If `containerName` is provided,
   * it will update logs for the `containerName` before executing
   * the flush operation
   * @param containerName Name of the container
   */
  const flushLogsBuffer = (containerName?: string) => {
    if (containerName) {
      updateContainerLogs(containerName, [
        ...(logsBufferRef.current[containerName] || []),
      ]);
      logsBufferRef.current[containerName] = [];
      return;
    }

    // If no container name is provided flush all,
    logsBufferRef.current = {};
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

        if (!logsBufferRef.current[containerName]) {
          logsBufferRef.current[containerName] = [];
        }

        logsBufferRef.current[containerName].push({
          line: ansiLog,
          lineNumber: logsBufferRef.current[containerName].length + 1,
        });

        // If size of the logs buffer is exceeded, immediately flush the buffer
        if (logsBufferRef.current[containerName].length > LOGS_BUFFER_SIZE) {
          flushLogsBuffer(containerName);
        }
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

    // Flush and re-initialize empty buffer
    flushLogsBuffer(currentContainer);
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

    flushLogsBuffer();
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

  useEffect(() => {
    flushLogsBuffer(currentContainer);
  }, []);

  /**
   * In some situations, we might never hit the limit for the max buffer size.
   * An example is if the total logs for the pod < LOGS_BUFFER_SIZE.
   *
   * For handling situations like this, we would want to force a flush operation
   * on the buffer so that we dont have any stale logs
   */
  useEffect(() => {
    const flushAllLogs = () =>
      Object.keys(logsBufferRef.current).forEach((container) =>
        flushLogsBuffer(container)
      );

    /**
     * We dont want users to wait for too long for the initial
     * logs to appear. So we use a setTimeout for 1s to force-flush
     * logs after 1s of load
     */
    setTimeout(flushAllLogs, 1000);

    const flushLogsBufferInterval = setInterval(flushAllLogs, 5000);

    return () => clearInterval(flushLogsBufferInterval);
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
    setCurrentContainer: (newContainer: string) => {
      // First flush the logs of the older container
      flushLogsBuffer(currentContainer);
      setCurrentContainer(newContainer);
    },
    logs: currentLogs,
    previousLogs: currentPreviousLogs,
    refresh,
  };
};
