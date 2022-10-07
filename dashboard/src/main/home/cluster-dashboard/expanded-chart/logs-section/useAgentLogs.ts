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
  // if setDate is set, results are not live
  setDate: Date
) => {
  var d = new Date();
  d.setDate(d.getDate() - 14);

  const isLive = !setDate;
  const { currentCluster, currentProject } = useContext(Context);
  const [logs, setLogs] = useState<Anser.AnserJsonEntry[][]>([]);
  const [startDate, setStartDate] = useState<Date>(d);
  const [endDate, setEndDate] = useState<Date>(setDate || new Date());

  // if we are live:
  // - start date is initially set to 2 weeks ago
  // - the query has an end date set to current date
  // - moving the cursor forward does nothing

  // if we are not live:
  // - end date is set to the setDate
  // - start date is initially set to 2 weeks ago, but then gets set to the
  //   result of the initial query
  // - moving the cursor both forward and backward changes the start and end dates

  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();

  useEffect(() => {
    return refresh();
  }, [currentPod, namespace, searchParam, setDate]);

  useEffect(() => {
    // if the streaming is no longer live, close all websockets
    if (!isLive) {
      closeAllWebsockets();
    }
  }, [isLive]);

  const setupWebsocket = (websocketKey: string) => {
    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/logs/loki?pod_selector=${currentPod}&namespace=${namespace}&search_param=${searchParam}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        let newLogs: Anser.AnserJsonEntry[][] = [];

        evt?.data?.split("\n").forEach((logLine: string) => {
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

  const queryLogs = (
    initLogs: Anser.AnserJsonEntry[][],
    startDate: Date,
    endDate: Date,
    direction: string,
    cb?: () => void
  ) => {
    api
      .getLogs(
        "<token>",
        {
          pod_selector: currentPod,
          namespace: namespace,
          search_param: searchParam,
          start_range: startDate.toISOString(),
          end_range: endDate.toISOString(),
          limit: 1000,
          direction: direction,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        var newLogs: Anser.AnserJsonEntry[][] = [];
        res.data.logs?.forEach((logLine: any) => {
          if (logLine) {
            var parsedLine = JSON.parse(logLine.line);

            let ansiLog = Anser.ansiToJson(parsedLine.log);
            newLogs.push(ansiLog);
          }
        });

        var modifiedLogs: Anser.AnserJsonEntry[][] = initLogs;

        if (direction == "forward") {
          modifiedLogs.push(...newLogs);
        } else if (direction == "backward") {
          modifiedLogs.push(...newLogs.reverse());
        }

        setLogs([...modifiedLogs]);
        cb && cb();
      });
  };

  const refresh = () => {
    if (!currentPod) {
      return;
    }

    const websocketKey = `${currentPod}-${namespace}-websocket`;
    var newEndDate = setDate || new Date();

    queryLogs([], startDate, newEndDate, "backward", () => {
      setEndDate(newEndDate);
      closeWebsocket(websocketKey);

      if (isLive) {
        setupWebsocket(websocketKey);
        return () => {
          closeWebsocket(websocketKey);
        };
      }
    });
  };

  const moveCursor = (direction: number) => {
    if (direction < 0) {
      // we query by setting the endDate equal to the previous startDate, and setting the direction
      // to "backward"
      var twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      queryLogs(logs, twoWeeksAgo, startDate, "backward", () => {
        setEndDate(startDate);
        setStartDate(twoWeeksAgo);
      });
    } else {
      if (isLive) {
        return;
      }

      // we query by setting the startDate equal to the previous endDate, setting the endDate equal to the
      // current time, and setting the direction to "forward"
      var currDate = new Date();
      queryLogs(logs, endDate, currDate, "forward", () => {
        setStartDate(endDate);
        setEndDate(currDate);
      });
    }
  };

  return {
    logs,
    refresh,
    moveCursor,
  };
};
