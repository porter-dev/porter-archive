import Anser, { AnserJsonEntry } from "anser";
import dayjs from "dayjs";
import _ from "lodash";
import { useContext, useEffect, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";

const MAX_LOGS = 5000;
const MAX_BUFFER_LOGS = 1000;

export enum Direction {
  forward = "forward",
  backward = "backward",
}

interface Log {
  line: AnserJsonEntry[];
  lineNumber: number;
  timestamp: string;
}

const parseLogs = (logs: string[] = []): AnserJsonEntry[][] => {
  return logs.filter(Boolean).map((logLine: string) => {
    const parsedLine = JSON.parse(logLine);
    // TODO Move log parsing to the render method
    const ansiLog = Anser.ansiToJson(parsedLine.log);
    return ansiLog;
  });
};

export const useLogs = (
  currentPod: string,
  namespace: string,
  searchParam: string,
  // if setDate is set, results are not live
  setDate?: Date
) => {
  const d = dayjs().subtract(14, "days");

  const isLive = !setDate;
  const logsBufferRef = useRef<AnserJsonEntry[][]>([]);
  const { currentCluster, currentProject } = useContext(Context);
  const [logs, setLogs] = useState<AnserJsonEntry[][]>([]);
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(d);
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(dayjs(setDate));

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

  const updateLogs = (newLogs: AnserJsonEntry[][]) => {
    setLogs((logs) => {
      let currentLogs = logs;
      currentLogs.push(...newLogs);
      if (logs.length > MAX_LOGS) {
        const logsToBeRemoved =
          newLogs.length < MAX_BUFFER_LOGS ? newLogs.length : MAX_BUFFER_LOGS;
        currentLogs = currentLogs.slice(logsToBeRemoved);
      }

      return logs;
    });
  };

  /**
   * Flushes the logs buffer. If `discard` is true,
   * it will update `current logs` before executing
   * the flush operation
   */
  const flushLogsBuffer = (discard: boolean = false) => {
    if (!discard) {
      updateLogs(logsBufferRef.current ?? []);
    }

    logsBufferRef.current = [];
  };

  const pushLogs = (newLogs: AnserJsonEntry[][]) => {
    logsBufferRef.current.push(...newLogs);

    if (logsBufferRef.current.length > MAX_BUFFER_LOGS) {
      flushLogsBuffer();
    }
  };

  const setupWebsocket = (websocketKey: string) => {
    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/logs/loki?pod_selector=${currentPod}&namespace=${namespace}&search_param=${searchParam}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        const newLogs = parseLogs(evt?.data?.split("\n"));

        pushLogs(newLogs);
      },
      onclose: () => {
        console.log("Closed websocket:", websocketKey);
      },
    };

    newWebsocket(websocketKey, endpoint, config);
    openWebsocket(websocketKey);
  };

  const queryLogs = (
    startDate: Date,
    endDate: Date,
    direction: Direction,
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
        const newLogs = parseLogs(
          res.data.logs?.filter(Boolean).map((logLine: any) => logLine.line)
        );

        pushLogs(
          direction === Direction.backward ? newLogs.reverse() : newLogs
        );
        cb && cb();
      });
  };

  const refresh = () => {
    if (!currentPod) {
      return;
    }

    flushLogsBuffer(true);
    const websocketKey = `${currentPod}-${namespace}-websocket`;
    const newEndDate = dayjs(setDate);

    queryLogs(
      startDate.toDate(),
      newEndDate.toDate(),
      Direction.backward,
      () => {
        setEndDate(newEndDate);
        closeWebsocket(websocketKey);

        if (isLive) {
          setupWebsocket(websocketKey);
          return () => {
            closeWebsocket(websocketKey);
          };
        }
      }
    );
  };

  const moveCursor = (direction: number) => {
    if (direction < 0) {
      // we query by setting the endDate equal to the previous startDate, and setting the direction
      // to "backward"
      const twoWeeksAgo = dayjs().subtract(14, "days");

      queryLogs(
        twoWeeksAgo.toDate(),
        startDate.toDate(),
        Direction.backward,
        () => {
          setEndDate(startDate);
          setStartDate(twoWeeksAgo);
        }
      );
    } else {
      if (isLive) {
        return;
      }

      // we query by setting the startDate equal to the previous endDate, setting the endDate equal to the
      // current time, and setting the direction to "forward"
      const currDate = dayjs();
      queryLogs(endDate.toDate(), currDate.toDate(), Direction.forward, () => {
        setStartDate(endDate);
        setEndDate(currDate);
      });
    }
  };

  useEffect(() => {
    flushLogsBuffer(true);
  }, []);

  /**
   * In some situations, we might never hit the limit for the max buffer size.
   * An example is if the total logs for the pod < MAX_BUFFER_LOGS.
   *
   * For handling situations like this, we would want to force a flush operation
   * on the buffer so that we dont have any stale logs
   */
  useEffect(() => {
    /**
     * We don't want users to wait for too long for the initial
     * logs to appear. So we use a setTimeout for 1s to force-flush
     * logs after 1s of load
     */
    setTimeout(flushLogsBuffer, 500);

    const flushLogsBufferInterval = setInterval(flushLogsBuffer, 3000);

    return () => clearInterval(flushLogsBufferInterval);
  }, []);

  useEffect(() => {
    refresh();
  }, [currentPod, namespace, searchParam, setDate]);

  useEffect(() => {
    // if the streaming is no longer live, close all websockets
    if (!isLive) {
      closeAllWebsockets();
    }
  }, [isLive]);

  return {
    logs,
    refresh,
    moveCursor,
  };
};
