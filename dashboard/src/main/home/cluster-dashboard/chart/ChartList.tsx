import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ChartType, ClusterType, StorageType } from "shared/types";
import { PorterUrl } from "shared/routing";

import Chart from "./Chart";
import Loading from "components/Loading";
import { useWebsockets } from "shared/hooks/useWebsockets";

type Props = {
  currentCluster: ClusterType;
  namespace: string;
  // TODO Convert to enum
  sortType: string;
  currentView: PorterUrl;
};

const ChartList: React.FunctionComponent<Props> = ({
  namespace,
  sortType,
  currentView,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const context = useContext(Context);

  const updateCharts = async () => {
    try {
      const { currentCluster, currentProject } = context;
      setIsLoading(true);
      const res = await api.getCharts(
        "<token>",
        {
          namespace: namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
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
            "superseded",
            "failed",
          ],
        },
        { id: currentProject.id }
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

  const setupHelmReleasesWebsocket = (namespace: string) => {
    let apiPath = `/api/projects/${context.currentProject.id}/k8s/helm_releases?cluster_id=${context.currentCluster.id}`;
    if (namespace) {
      apiPath += `&namespace=${namespace}`;
    }

    const wsConfig = {
      onopen: () => {
        console.log("connected to chart live updates websocket");
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        const newChart = event.Object;
        const matches = (chart: ChartType) => chart.name === newChart.name;
        setCharts((currentCharts) => {
          switch (event.event_type) {
            case "ADD":
            // upgrades emit both ADD and UPDATE events
            case "UPDATE":
              let updated = false;
              const result = currentCharts.map((chart) => {
                if (matches(chart)) {
                  updated = true;
                  return newChart;
                }
                return chart;
              });
              if (!updated) {
                result.push(newChart);
              }
              return result;
            case "DELETE":
              return currentCharts.filter((chart) => !matches(chart));
            default:
              return currentCharts;
          }
        });
      },

      onclose: () => {
        console.log("closing chart live updates websocket");
      },

      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket("helm_releases");
      },
    };

    newWebsocket("helm_releases", apiPath, wsConfig);
    openWebsocket("helm_releases");
  };

  const setupWebsocket = (kind: string) => {
    let { currentCluster, currentProject } = context;
    const apiPath = `/api/projects/${currentProject.id}/k8s/${kind}/status?cluster_id=${currentCluster.id}`;

    const wsConfig = {
      onopen: () => {
        console.log("connected to websocket");
      },
      onmessage: (evt: MessageEvent) => {
        let event = JSON.parse(evt.data);
        let object = event.Object;
        object.metadata.kind = event.Kind;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [object.metadata.uid]: object,
        }));
      },
      onclose: () => {
        console.log("closing websocket");
      },
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(kind);
      },
    };

    newWebsocket(kind, apiPath, wsConfig);

    openWebsocket(kind);
  };

  const setControllerWebsockets = (controllers: any[]) => {
    controllers.map((kind: string) => {
      return setupWebsocket(kind);
    });
  };

  // Setup basic websockets on start
  useEffect(() => {
    setControllerWebsockets([
      "deployment",
      "statefulset",
      "daemonset",
      "replicaset",
    ]);
    setupHelmReleasesWebsocket(namespace);

    return () => {
      closeAllWebsockets();
    };
  }, [namespace]);

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
    return () => (isSubscribed = false);
  }, [namespace, currentView]);

  const filteredCharts = useMemo(() => {
    const result = charts.filter((chart: ChartType) => {
      return (
        (currentView == "jobs" && chart.chart.metadata.name == "job") ||
        ((currentView == "applications" ||
          currentView == "cluster-dashboard") &&
          chart.chart.metadata.name != "job")
      );
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
    }

    return result;
  }, [charts, sortType]);

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
    } else if (filteredCharts.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No
          {currentView === "jobs" ? ` jobs` : ` charts`} found in this
          namespace.
        </Placeholder>
      );
    }

    return filteredCharts.map((chart: ChartType, i: number) => {
      return (
        <Chart
          key={`${chart.namespace}-${chart.name}`}
          chart={chart}
          controllers={controllers || {}}
          isJob={currentView === "jobs"}
        />
      );
    });
  };

  return <StyledChartList>{renderChartList()}</StyledChartList>;
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
  padding-bottom: 105px;
`;
