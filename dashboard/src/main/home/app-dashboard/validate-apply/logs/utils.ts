import dayjs, { Dayjs } from "dayjs";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import api from "shared/api";
import Anser from "anser";
import { useWebsockets, NewWebsocketOptions } from "shared/hooks/useWebsockets";
import {
  AgentLog,
  agentLogValidator,
  Direction,
  PorterLog,
  PaginationInfo,
  LogFilterName,
  GenericLogFilter
} from "../../expanded-app/logs/types";

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

export const useLogs = ({
  projectID,
  clusterID,
  selectedFilterValues,
  appName,
  serviceName,
  deploymentTargetId,
  searchParam,
  notify,
  setLoading,
  revisionIdToNumber,
  setDate,
  appRevisionId = "",
  timeRange,
  filterPredeploy,
}: {
  projectID: number,
  clusterID: number,
  selectedFilterValues: Record<LogFilterName, string>,
  appName: string,
  serviceName: string,
  deploymentTargetId: string,
  searchParam: string,
  notify: (message: string) => void,
  setLoading: (isLoading: boolean) => void,
  revisionIdToNumber: Record<string, number>,
  // if setDate is set, results are not live
  setDate?: Date,
  appRevisionId?: string,
  timeRange?: {
    startTime?: Dayjs,
    endTime?: Dayjs,
  },
  filterPredeploy: boolean,
}
) => {
  const [isLive, setIsLive] = useState<boolean>(!setDate && (timeRange?.startTime == null && timeRange?.endTime == null));
  const logsBufferRef = useRef<PorterLog[]>([]);
  const [logs, setLogs] = useState<PorterLog[]>([]);
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
    const websocketBaseURL = `/api/projects/${projectID}/clusters/${clusterID}/apps/logs/loki`;

    const searchParams = {
      app_name: appName,
      service_name: serviceName,
      deployment_target_id: deploymentTargetId,
      search_param: searchParam,
      app_revision_id: appRevisionId,
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

      if (selectedFilterValues.output_stream !== GenericLogFilter.getDefaultOption("output_stream").value &&
        log.metadata.output_stream !== selectedFilterValues.output_stream) {
        return false;
      }

      if (filterPredeploy && (log.metadata.raw_labels?.porter_run_service_name ?? "").endsWith("predeploy")) {
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
    try {
      const getLogsReq = {
        app_name: appName,
        service_name: serviceName,
        deployment_target_id: deploymentTargetId,
        search_param: searchParam,
        start_range: startDate,
        end_range: endDate,
        limit,
        direction,
        app_revision_id: appRevisionId,
      };

      const logsResp = await api.appLogs(
        "<token>",
        getLogsReq,
        {
          cluster_id: clusterID,
          project_id: projectID,
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

      newLogs.filter((log) => {
        return log.metadata?.raw_labels?.porter_run_app_revision_id != null
          && revisionIdToNumber[log.metadata.raw_labels.porter_run_app_revision_id] != null
          && revisionIdToNumber[log.metadata.raw_labels.porter_run_app_revision_id] != 0
      }).forEach((log) => {
        if (log.metadata?.raw_labels?.porter_run_app_revision_id != null) {
          const revisionNumber = revisionIdToNumber[log.metadata.raw_labels.porter_run_app_revision_id];
          if (revisionNumber != null && revisionNumber != 0) {
            log.metadata.revision = revisionNumber.toString();
          }
        }
      })

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

  const refresh = async ({ isLive }: { isLive: boolean }) => {
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
    const websocketKey = `${appName}-${serviceName}-websocket-${suffix}`;

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
    // if a complete time range is not given, then we are live
    const isLive = !setDate && (timeRange?.startTime == null || timeRange?.endTime == null);
    refresh({ isLive });
    setIsLive(isLive);
  }, [
    appName,
    serviceName,
    deploymentTargetId,
    searchParam,
    setDate,
    JSON.stringify(selectedFilterValues),
    JSON.stringify(timeRange?.endTime),
    filterPredeploy
  ]);

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