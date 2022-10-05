import Anser from "anser";
import { flatMap } from "lodash";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";

const MAX_LOGS = 250;

export const useLogs = (
  currentPod: string,
  namespace: string,
  searchParam: string,
  scroll?: (smooth: boolean) => void
) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [logs, setLogs] = useState<Anser.AnserJsonEntry[][]>([]);
  const [initialized, setInitialized] = useState(false);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    getWebsocket,
    closeWebsocket,
  } = useWebsockets();

  useEffect(() => {
    if (!currentPod) {
      return;
    }
    api
      .getLogs(
        "<token>",
        {
          pod_selector: currentPod,
          namespace: namespace,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        console.log(res.data);
        var initLogs: Anser.AnserJsonEntry[][] = [];
        res.data.logs?.forEach((logLine: any) => {
          var parsedLine = JSON.parse(logLine.line);

          let ansiLog = Anser.ansiToJson(parsedLine.log);
          initLogs.push(ansiLog);
        });

        setLogs(initLogs.reverse());
        setInitialized(true);
        refresh();
      });
  }, [currentPod, namespace]);

  const setupWebsocket = (websocketKey: string) => {
    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/logs/loki?pod_selector=${currentPod}&namespace=${namespace}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        let newLogs: Anser.AnserJsonEntry[][] = [];

        evt.data.split("\n").forEach((logLine: string) => {
          if (logLine) {
            var parsedLine = JSON.parse(logLine);

            let ansiLog = Anser.ansiToJson(parsedLine.log);
            newLogs.push(ansiLog);
          }
        });

        setLogs((prevLogs) => {
          return prevLogs.concat(newLogs);
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
    const websocketKey = `${currentPod}-${namespace}-websocket`;
    closeWebsocket(websocketKey);

    setupWebsocket(websocketKey);
  };

  useEffect(() => {
    if (!currentPod) {
      return;
    }

    if (!initialized) {
      return;
    }

    refresh();
  }, [currentPod, namespace]);

  return {
    logs,
    refresh,
  };
};
