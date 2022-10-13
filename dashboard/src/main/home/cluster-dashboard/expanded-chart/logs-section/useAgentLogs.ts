import Anser, { AnserJsonEntry } from "anser";
import dayjs from "dayjs";
import _ from "lodash";
import { useContext, useEffect, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";
import { isJSON } from "shared/util";

const MAX_LOGS = 5000;
const MAX_BUFFER_LOGS = 1000;
const QUERY_LIMIT = 1000;

export enum Direction {
  forward = "forward",
  backward = "backward",
}

interface Log {
  line: AnserJsonEntry[];
  lineNumber: number;
  timestamp: string;
}

interface LogLine {
  log: string;
  stream: string;
  time: string;
}

const parseLogs = (logs: string[] = []): Log[] => {
  return logs
    .filter(Boolean)
    .filter(isJSON)
    .map((logLine: string, idx) => {
      try {
        const parsedLine: LogLine = JSON.parse(logLine);
        // TODO Move log parsing to the render method
        const ansiLog = Anser.ansiToJson(parsedLine.log);
        return {
          line: ansiLog,
          lineNumber: idx + 1,
          timestamp: parsedLine.time,
        };
      } catch (err) {
        console.error(err, logLine);
      }
    });
};

interface PaginationInfo {
  previousCursor: string | null;
  nextCursor: string | null;
}

export const useLogs = (
  currentPod: string,
  namespace: string,
  searchParam: string,
  // if setDate is set, results are not live
  setDate?: Date
) => {
  const isLive = !setDate;
  const logsBufferRef = useRef<Log[]>([]);
  const { currentCluster, currentProject } = useContext(Context);
  const [logs, setLogs] = useState<Log[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    previousCursor: null,
    nextCursor: null,
  });

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

  const updateLogs = (
    newLogs: Log[],
    direction: Direction = Direction.forward
  ) => {
    // Nothing to update here
    if (!newLogs.length) {
      return;
    }

    setLogs((logs) => {
      let updatedLogs = _.cloneDeep(logs);

      /**
       * If direction = Direction.forward, we want to append the new logs
       * at the end of the current logs, else we want to append before the current logs
       *
       */
      if (direction === Direction.forward) {
        const lastLineNumber = updatedLogs.at(-1)?.lineNumber ?? 0;

        updatedLogs.push(
          ...newLogs.map((log, idx) => ({
            ...log,
            lineNumber: lastLineNumber + idx + 1,
          }))
        );

        // For direction = Direction.forward, remove logs from the front
        if (updatedLogs.length > MAX_LOGS) {
          const logsToBeRemoved =
            newLogs.length < MAX_BUFFER_LOGS ? newLogs.length : MAX_BUFFER_LOGS;
          updatedLogs = updatedLogs.slice(logsToBeRemoved);
        }
      } else {
        updatedLogs = newLogs.concat(
          updatedLogs.map((log) => ({
            ...log,
            lineNumber: log.lineNumber + newLogs.length,
          }))
        );

        // For direction = Direction.backward, remove logs from the back
        if (updatedLogs.length > MAX_LOGS) {
          const logsToBeRemoved =
            newLogs.length < MAX_BUFFER_LOGS ? newLogs.length : MAX_BUFFER_LOGS;

          updatedLogs = updatedLogs.slice(0, logsToBeRemoved);
        }
      }

      return updatedLogs;
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

  const pushLogs = (newLogs: Log[]) => {
    logsBufferRef.current.push(...newLogs);

    if (logsBufferRef.current.length >= MAX_BUFFER_LOGS) {
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
        const newLogs = parseLogs(
          evt?.data?.split("}\n").map((line: string) => line + "}")
        );

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
    startDate: string,
    endDate: string,
    direction: Direction,
    limit: number = QUERY_LIMIT
  ) => {
    return api
      .getLogs(
        "<token>",
        {
          pod_selector: currentPod,
          namespace,
          search_param: searchParam,
          start_range: startDate,
          end_range: endDate,
          limit,
          direction,
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

        return {
          logs: newLogs,
          previousCursor: res.data.backward_continue_time,
          nextCursor: res.data.forward_continue_time,
        };
      });
  };

  const refresh = async () => {
    if (!currentPod) {
      return;
    }

    setLogs([]);
    flushLogsBuffer(true);
    const websocketKey = `${currentPod}-${namespace}-websocket`;
    const endDate = dayjs(setDate);
    const twoWeeksAgo = endDate.subtract(14, "days");

    const { logs: initialLogs, previousCursor, nextCursor } = await queryLogs(
      twoWeeksAgo.toISOString(),
      endDate.toISOString(),
      Direction.forward
    );

    setPaginationInfo({
      previousCursor,
      nextCursor,
    });

    updateLogs(initialLogs);

    closeWebsocket(websocketKey);

    if (isLive) {
      setupWebsocket(websocketKey);
    }

    return () => isLive && closeWebsocket(websocketKey);
  };

  const moveCursor = async (direction: Direction) => {
    if (direction === Direction.backward) {
      // we query by setting the endDate equal to the previous startDate, and setting the direction
      // to "backward"
      const refDate = paginationInfo.previousCursor ?? dayjs().toISOString();
      const twoWeeksAgo = dayjs(refDate).subtract(14, "days");

      const { logs: newLogs, previousCursor } = await queryLogs(
        twoWeeksAgo.toISOString(),
        refDate,
        Direction.backward
      );

      updateLogs(
        paginationInfo.previousCursor ? newLogs.slice(0, -1) : newLogs,
        direction
      );

      setPaginationInfo((paginationInfo) => ({
        ...paginationInfo,
        previousCursor,
      }));
    } else {
      if (isLive) {
        return;
      }

      // we query by setting the startDate equal to the previous endDate, setting the endDate equal to the
      // current time, and setting the direction to "forward"
      const refDate = paginationInfo.nextCursor ?? dayjs(setDate).toISOString();
      const currDate = dayjs();

      const { logs: newLogs, nextCursor } = await queryLogs(
        refDate,
        currDate.toISOString(),
        Direction.forward
      );

      // If previously we had next cursor set, it is likely that the log might have a duplicate entry so we ignore the first line
      updateLogs(paginationInfo.nextCursor ? newLogs.slice(1) : newLogs);

      setPaginationInfo((paginationInfo) => ({
        ...paginationInfo,
        nextCursor,
      }));
    }
  };

  useEffect(() => {
    setLogs([]);
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
    paginationInfo,
  };
};
