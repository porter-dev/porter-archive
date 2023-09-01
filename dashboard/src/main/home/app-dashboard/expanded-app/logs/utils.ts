import dayjs, { Dayjs } from "dayjs";
import _ from "lodash";
import { useContext, useEffect, useRef, useState } from "react";
import api from "shared/api";
import Anser from "anser";
import { Context } from "shared/Context";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";
import { ChartType } from "shared/types";
import { AgentLog, agentLogValidator, Direction, PorterLog, PaginationInfo, GenericLogFilter, LogFilterName } from "./types";
import { Service } from "../../new-app-flow/serviceTypes";

const MAX_LOGS = 5000;
const MAX_BUFFER_LOGS = 1000;
const QUERY_LIMIT = 1000;

export const parseLogs = (logs: any[] = []): PorterLog[] => {
  return logs.map((log: any, idx) => {
    try {
      const parsed: AgentLog = agentLogValidator.parse(log);

      // TODO Move log parsing to the render method
      const ansiLog = Anser.ansiToJson(parsed.line);
      return {
        line: ansiLog,
        lineNumber: idx + 1,
        timestamp: parsed.timestamp,
        metadata: parsed.metadata,
      };
    } catch (err) {
      console.log(err)
      return {
        line: Anser.ansiToJson(log.toString()),
        lineNumber: idx + 1,
        timestamp: undefined,
      }
    }
  });
};

export const useLogs = (
  selectedFilterValues: Record<LogFilterName, string>,
  appName: string,
  namespace: string,
  searchParam: string,
  notify: (message: string) => void,
  currentChart: ChartType | undefined,
  setLoading: (isLoading: boolean) => void,
  // if setDate is set, results are not live
  setDate?: Date,
  timeRange?: {
    startTime?: Dayjs,
    endTime?: Dayjs,
  },
) => {
  const isLive = !setDate;
  const logsBufferRef = useRef<PorterLog[]>([]);
  const { currentCluster, currentProject } = useContext(
    Context
  );
  const [logs, setLogs] = useState<PorterLog[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    previousCursor: null,
    nextCursor: null,
  });

  // if currentPodName is default value we are looking at all chart pod logs
  const currentPodSelector = selectedFilterValues.pod_name === GenericLogFilter.getDefaultOption("pod_name").value
    ? `${currentChart?.name ?? ''}-.*` : `${currentChart?.name}-${selectedFilterValues.pod_name}-.*`;

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
    closeAllWebsockets,
  } = useWebsockets();

  const updateLogs = (
    newLogs: PorterLog[],
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

      return filterLogs(updatedLogs);
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

  const pushLogs = (newLogs: PorterLog[]) => {
    logsBufferRef.current.push(...newLogs);

    if (logsBufferRef.current.length >= MAX_BUFFER_LOGS) {
      flushLogsBuffer();
    }
  };

  const setupWebsocket = (websocketKey: string) => {
    if (namespace == "" || currentCluster == null || currentProject == null || currentChart == null) {
      return;
    }

    const websocketBaseURL = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${namespace}/logs/loki`;

    const searchParams = {
      pod_selector: currentPodSelector,
      namespace,
      search_param: searchParam,
      revision: currentChart.version.toString(),
    }

    const q = new URLSearchParams(searchParams).toString();

    const endpoint = `${websocketBaseURL}?${q}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        // Nothing to do here
        if (evt.data == null) {
          return;
        }
        const jsonData = evt.data.trim().split("\n")
        const newLogs: any[] = [];
        jsonData.forEach((data: string) => {
          try {
            const jsonLog = JSON.parse(data);
            newLogs.push(jsonLog)
          } catch (err) {
            // TODO: better error handling
            // console.log(err)
          }
        });
        const newLogsParsed = parseLogs(newLogs);
        const newLogsFiltered = filterLogs(newLogsParsed);
        pushLogs(newLogsFiltered);
      },
      onclose: () => {
        console.log("Closed websocket:", websocketKey);
      },
    };

    newWebsocket(websocketKey, endpoint, config);
    openWebsocket(websocketKey);
  };

  const filterLogs = (logs: PorterLog[]) => {
    return logs.filter(log => {
      if (log.metadata == null) {
        return true;
      }

      // TODO: refactor this extremely hacky way to filter out pre-deploy logs
      if (!currentChart?.name.endsWith("-r") && log.metadata.pod_name.startsWith(`${appName}-r`)) {
        return false;
      }

      if (selectedFilterValues.output_stream !== GenericLogFilter.getDefaultOption("output_stream").value &&
        log.metadata.output_stream !== selectedFilterValues.output_stream) {
        return false;
      }

      if (selectedFilterValues.revision !== GenericLogFilter.getDefaultOption("revision").value &&
        log.metadata.revision !== selectedFilterValues.revision) {
        return false;
      }

      return true;
    });
  };

  const queryLogs = async (
    startDate: string,
    endDate: string,
    direction: Direction,
    limit: number = QUERY_LIMIT
  ): Promise<{
    logs: PorterLog[];
    previousCursor: string | null;
    nextCursor: string | null;
  }> => {
    if (currentCluster == null || currentProject == null) {
      return {
        logs: [],
        previousCursor: null,
        nextCursor: null,
      };
    }

    const getLogsReq = {
      namespace,
      search_param: searchParam,
      start_range: startDate,
      end_range: endDate,
      limit,
      chart_name: "",
      pod_selector: currentPodSelector,
      direction,
    };

    if (currentChart == null) {
      return {
        logs: [],
        previousCursor: null,
        nextCursor: null,
      };
    }

    // special casing for pre-deploy logs - see get_logs_within_time_range.go
    if (currentChart.name.endsWith("-r")) {
      getLogsReq.chart_name = currentChart.name;
      getLogsReq.pod_selector = "";
    }

    try {
      const logsResp = await api.getLogsWithinTimeRange(
        "<token>",
        getLogsReq,
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )

      if (logsResp.data == null) {
        return {
          logs: [],
          previousCursor: null,
          nextCursor: null,
        };
      }

      const newLogs = parseLogs(logsResp.data.logs);
      if (direction === Direction.backward) {
        newLogs.reverse();
      }
      return {
        logs: newLogs,
        previousCursor:
          // There are no more historical logs so don't set the previous cursor
          newLogs.length < QUERY_LIMIT && direction == Direction.backward
            ? null
            : logsResp.data.backward_continue_time,
        nextCursor: logsResp.data.forward_continue_time,
      };
    } catch {
      return {
        logs: [],
        previousCursor: null,
        nextCursor: null,
      };
    }
  };

  const refresh = async () => {
    if (!currentPodSelector) {
      return;
    }

    setLoading(true);
    setLogs([]);
    flushLogsBuffer(true);
    const endDate = timeRange?.endTime != null ? timeRange.endTime : dayjs(setDate);
    const oneDayAgo = timeRange?.startTime != null ? timeRange.startTime : endDate.subtract(1, "day");

    const { logs: initialLogs, previousCursor, nextCursor } = await queryLogs(
      oneDayAgo.toISOString(),
      endDate.toISOString(),
      Direction.backward
    );

    setPaginationInfo({
      previousCursor,
      nextCursor,
    });

    updateLogs(initialLogs);

    if (!isLive && !initialLogs.length) {
      notify(
        "You have no logs for this time period. Try with a different time range."
      );
    }

    closeAllWebsockets();
    const suffix = Math.random().toString(36).substring(2, 15);
    const websocketKey = `${currentPodSelector}-${namespace}-websocket-${suffix}`;

    setLoading(false);

    if (isLive) {
      setupWebsocket(websocketKey);
    }
  };

  const moveCursor = async (direction: Direction) => {
    if (direction === Direction.backward) {
      // we query by setting the endDate equal to the previous startDate, and setting the direction
      // to "backward"
      const refDate = paginationInfo.previousCursor ?? dayjs().toISOString();
      const oneDayAgo = dayjs(refDate).subtract(1, "day");

      const { logs: newLogs, previousCursor } = await queryLogs(
        oneDayAgo.toISOString(),
        refDate,
        Direction.backward
      );

      const logsToUpdate = paginationInfo.previousCursor
        ? newLogs.slice(0, -1)
        : newLogs;

      updateLogs(logsToUpdate, direction);

      if (!logsToUpdate.length) {
        notify("You have reached the beginning of the logs");
      }

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

      const logsToUpdate = paginationInfo.nextCursor
        ? newLogs.slice(1)
        : newLogs;

      // If previously we had next cursor set, it is likely that the log might have a duplicate entry so we ignore the first line
      updateLogs(logsToUpdate);

      if (!logsToUpdate.length) {
        notify("You are already at the latest logs");
      }

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
  }, [currentPodSelector, namespace, searchParam, setDate, selectedFilterValues]);

  useEffect(() => {
    // if the streaming is no longer live, close all websockets
    if (!isLive) {
      closeAllWebsockets();
    }
  }, [isLive]);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  return {
    logs,
    refresh,
    moveCursor,
    paginationInfo,
  };
};

export const getVersionTagColor = (version: string) => {
  const colors = [
    "#7B61FF",
    "#FF7B61",
    "#61FF7B",
  ];

  const versionInt = parseInt(version);
  if (isNaN(versionInt)) {
    return colors[0];
  }
  return colors[versionInt % colors.length];
};

export const getServiceNameFromPodNameAndAppName = (podName: string, porterAppName: string) => {
  const prefix: string = porterAppName + "-";
  if (!podName.startsWith(prefix)) {
    return "";
  }

  podName = podName.replace(prefix, "");
  const suffixes: string[] = ["-web", "-wkr", "-job"];
  let index: number = -1;

  for (const suffix of suffixes) {
    const newIndex: number = podName.lastIndexOf(suffix);
    if (newIndex > index) {
      index = newIndex;
    }
  }

  if (index !== -1) {
    return podName.substring(0, index);
  }

  // if the suffix wasn't found, it's possible that the service name was too long to keep the entire suffix. example: postgres-snowflake-connector-postgres-snowflake-service-wk8gnst
  // if this is the case, find the service name by removing everything after the last dash
  // This is only to fix current pods; new pods will be named correctly because we imposed service name limits in https://github.com/porter-dev/porter/pull/3439
  index = podName.lastIndexOf("-");
  if (index !== -1) {
    return podName.substring(0, index)
  }

  return "";
}

export const getPodSelectorFromServiceName = (serviceName: string | null | undefined, services?: Service[]): string | undefined => {
  if (serviceName == null) {
    return undefined;
  }
  const match = services?.find(s => s.name === serviceName);
  if (match == null) {
    return undefined;
  }
  return `${match.name}-${match.type == "worker" ? "wkr" : match.type}`;
}
