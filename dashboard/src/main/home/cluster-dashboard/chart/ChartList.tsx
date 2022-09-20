import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import _ from "lodash";

import { Context } from "shared/Context";
import api from "shared/api";
import {
  ChartType,
  ClusterType,
  JobStatusType,
  JobStatusWithTimeType,
  StorageType,
} from "shared/types";
import { PorterUrl } from "shared/routing";

import Chart from "./Chart";
import Loading from "components/Loading";
import { useWebsockets } from "shared/hooks/useWebsockets";
import CronParser from "cron-parser";

type Props = {
  currentCluster: ClusterType;
  lastRunStatus?: JobStatusType | null | "all";
  namespace: string;
  // TODO Convert to enum
  sortType: string;
  currentView: PorterUrl;
  disableBottomPadding?: boolean;
  closeChartRedirectUrl?: string;
  selectedTag?: any;
  appFilters?: string[];
};

interface JobStatusWithTimeAndVersion extends JobStatusWithTimeType {
  resource_version: number;
}

const ChartList: React.FunctionComponent<Props> = ({
  lastRunStatus,
  namespace,
  sortType,
  currentView,
  disableBottomPadding,
  closeChartRedirectUrl,
  selectedTag,
  appFilters,
}) => {
  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();
  const [charts, setCharts] = useState<ChartType[]>([]);
  const [controllers, setControllers] = useState<
    Record<string, Record<string, any>>
  >({});
  const [jobStatus, setJobStatus] = useState<
    Record<string, JobStatusWithTimeAndVersion>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const context = useContext(Context);

  const getChartKey = (name: string, namespace: string) =>
    `${namespace}-${name}`;

  const updateCharts = async () => {
    try {
      const { currentCluster, currentProject } = context;
      setIsLoading(true);
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
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: namespace,
        }
      );
      const charts = res.data || [];
      setIsError(false);
      return charts;
    } catch (error) {
      console.log(error);
      context.setCurrentError(JSON.stringify(error));
      setIsError(true);
    }
  };

  const setupHelmReleasesWebsocket = (
    websocketID: string,
    namespace: string
  ) => {
    let apiPath = `/api/projects/${context.currentProject.id}/clusters/${context.currentCluster.id}/helm_release`;

    if (namespace) {
      apiPath += `?namespace=${namespace}`;
    }

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket: ${websocketID}`);
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        const newChart: ChartType = event.Object;
        const isSameChart = (chart: ChartType) =>
          getChartKey(chart.name, chart.namespace) ===
          getChartKey(newChart.name, newChart.namespace);
        setCharts((currentCharts) => {
          const tmpCharts = Array.isArray(currentCharts)
            ? [...currentCharts]
            : [];
          switch (event.event_type) {
            case "ADD":
              if (tmpCharts.find(isSameChart)) {
                return tmpCharts;
              }
              return tmpCharts.concat(newChart);
            case "UPDATE":
              return tmpCharts.map((chart) => {
                if (isSameChart(chart) && newChart.version >= chart.version) {
                  return newChart;
                }
                return chart;
              });
            case "DELETE":
              const chartToDelete = tmpCharts.find(isSameChart);
              if (chartToDelete.version === newChart.version) {
                return tmpCharts.filter((chart) => !isSameChart(chart));
              }
            default:
              return tmpCharts;
          }
        });
      },

      onclose: () => {
        console.log(`closing websocket: ${websocketID}`);
      },

      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketID);
      },
    };

    newWebsocket(websocketID, apiPath, wsConfig);
    openWebsocket(websocketID);
  };

  const setupControllerWebsocket = (kind: string) => {
    let { currentCluster, currentProject } = context;
    const apiPath = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket: ${kind}`);
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        let object = event?.Object;

        if (!object?.metadata?.kind) {
          return;
        }

        object.metadata.kind = event.Kind;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [object.metadata.uid]: object,
        }));
      },
      onclose: () => {
        console.log(`closing websocket: ${kind}`);
      },
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(kind);
      },
    };

    newWebsocket(kind, apiPath, wsConfig);

    openWebsocket(kind);
  };

  const setupControllerWebsockets = (controllers: string[]) => {
    controllers.map((kind) => setupControllerWebsocket(kind));
  };

  const setupJobWebsocket = (websocketID: string) => {
    const kind = "job";
    let { currentCluster, currentProject } = context;
    const apiPath = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket: ${websocketID}`);
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);

        if (event.event_type === "DELETE") {
          return;
        }

        let object = event.Object;

        if (_.get(object.metadata, ["annotations", "helm.sh/hook"])) {
          return;
        }

        setJobStatus((currentStatus) => {
          let nextStatus: JobStatusType = null;
          for (const status of Object.values(JobStatusType)) {
            if (_.get(object.status, status, 0) > 0) {
              nextStatus = status;
              break;
            }
          }

          const chartName =
            object.metadata.labels["app.kubernetes.io/instance"];
          const chartNamespace = object.metadata.namespace;
          const key = getChartKey(chartName, chartNamespace);

          const existingValue: JobStatusWithTimeAndVersion = _.get(
            currentStatus,
            key,
            null
          );
          const newValue: JobStatusWithTimeAndVersion = {
            status: nextStatus,
            start_time: object.status.startTime,
            resource_version: object.metadata.resourceVersion,
          };

          if (
            !existingValue ||
            Number(newValue.resource_version) >
              Number(existingValue.resource_version)
          ) {
            return {
              ...currentStatus,
              [key]: newValue,
            };
          }

          return currentStatus;
        });
      },
      onclose: () => {
        console.log(`closing websocket: ${websocketID}`);
      },
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketID);
      },
    };

    newWebsocket(websocketID, apiPath, wsConfig);

    openWebsocket(websocketID);
  };

  // Setup basic websockets on start
  useEffect(() => {
    const controllers = [
      "deployment",
      "statefulset",
      "daemonset",
      "replicaset",
    ];
    setupControllerWebsockets(controllers);

    const jobWebsocketID = "job";
    setupJobWebsocket(jobWebsocketID);

    return () => {
      controllers.map((controller) => closeWebsocket(controller));
      closeWebsocket(jobWebsocketID);
    };
  }, [context.currentCluster]);

  useEffect(() => {
    const websocketID = "helm_releases";

    setupHelmReleasesWebsocket(websocketID, namespace);

    return () => {
      closeWebsocket(websocketID);
    };
  }, [namespace, context.currentCluster]);

  useEffect(() => {
    let isSubscribed = true;

    if (namespace || namespace === "") {
      updateCharts().then((charts) => {
        if (isSubscribed) {
          setCharts(charts);
          setIsLoading(false);
        }
      });
    }
    return () => {
      isSubscribed = false;
    };
  }, [namespace, currentView, context.currentCluster]);

  const filteredCharts = useMemo(() => {
    if (!Array.isArray(charts)) {
      return [];
    }

    const result = charts
      .filter((chart) => {
        if (!selectedTag) {
          return true;
        }

        return !!selectedTag.releases?.find((release: ChartType) => {
          return release.name === chart.name;
        });
      })
      .filter((chart: ChartType) => {
        if (currentView === "jobs" && chart.chart.metadata.name === "job") {
          return true;
        }

        if (
          ["applications", "cluster-dashboard"].includes(currentView) &&
          chart.chart.metadata.name !== "job"
        ) {
          return true;
        }

        if (currentView === "stacks") {
          return true;
        }

        return false;
      })
      .filter((chart: ChartType) => {
        if (currentView !== "jobs") {
          return true;
        }
        if (lastRunStatus === null || lastRunStatus === "all") {
          return true;
        }
        const status: JobStatusWithTimeAndVersion = _.get(
          jobStatus,
          getChartKey(chart.name, chart.namespace),
          { status: null } as any
        );
        return status.status === lastRunStatus;
      })
      .filter((chart: ChartType) => {
        if (!Array.isArray(appFilters) || appFilters?.length === 0) {
          return true;
        }

        return appFilters.some((filter) => {
          return chart.name.toLowerCase() === filter.toLowerCase();
        });
      });

    if (sortType == "Newest") {
      result.sort((a: any, b: any) =>
        Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
          ? -1
          : 1
      );
    } else if (sortType == "Oldest") {
      result.sort((a: any, b: any) =>
        Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
          ? 1
          : -1
      );
    } else if (sortType == "Alphabetical") {
      result.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
    } else if (sortType == "Next Run" && currentView === "jobs") {
      const cronJobs = result.filter(
        (chart) => chart?.config?.schedule?.enabled
      );
      const nonCronJobs = result.filter(
        (chart) => !chart?.config?.schedule?.enabled
      );
      cronJobs.sort((a: any, b: any) => {
        let firstInterval = null;
        if (a?.config?.schedule?.enabled) {
          firstInterval = CronParser.parseExpression(
            a?.config?.schedule.value,
            {
              utc: true,
            }
          );
        }

        let secondInterval = null;
        if (b?.config?.schedule?.enabled) {
          secondInterval = CronParser.parseExpression(
            b?.config?.schedule.value,
            {
              utc: true,
            }
          );
        }

        return Date.parse(firstInterval.next().toISOString()) >
          Date.parse(secondInterval.next().toISOString())
          ? 1
          : -1;
      });

      return [...cronJobs, ...nonCronJobs];
    }

    return result;
  }, [charts, sortType, jobStatus, lastRunStatus, selectedTag]);

  const renderChartList = () => {
    if (isLoading || (!namespace && namespace !== "")) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (isError) {
      return (
        <Placeholder>
          <i className="material-icons">error</i> Error connecting to cluster.
        </Placeholder>
      );
    } else if (filteredCharts?.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No
          {currentView === "jobs" ? ` jobs` : ` charts`} found with the given
          filters.
        </Placeholder>
      );
    }

    return filteredCharts?.map((chart: ChartType, i: number) => {
      return (
        <Chart
          key={getChartKey(chart.name, chart.namespace)}
          chart={chart}
          controllers={controllers || {}}
          jobStatus={_.get(
            jobStatus,
            getChartKey(chart.name, chart.namespace),
            null
          )}
          isJob={currentView === "jobs"}
          closeChartRedirectUrl={closeChartRedirectUrl}
        />
      );
    });
  };

  return (
    <StyledChartList disableBottomPadding={disableBottomPadding}>
      {renderChartList()}
    </StyledChartList>
  );
};

export default ChartList;

const Placeholder = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  background: #26282f;
  border-radius: 5px;
  height: 370px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;

  > i {
    font-size: 16px;
    margin-right: 12px;
  }
`;

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const StyledChartList = styled.div`
  padding-bottom: ${(props: { disableBottomPadding: boolean }) => {
    if (props.disableBottomPadding) {
      return "unset";
    }

    return "105px";
  }};
`;
