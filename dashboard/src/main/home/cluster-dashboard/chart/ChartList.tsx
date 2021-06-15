import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";
import { ChartType, StorageType, ClusterType } from "shared/types";
import { PorterUrl } from "shared/routing";

import Chart from "./Chart";
import Loading from "components/Loading";
import { useWebsockets } from "shared/hooks/useWebsockets";

type PropsType = {
  currentCluster: ClusterType;
  namespace: string;
  // TODO Convert to enum
  sortType: string;
  currentView: PorterUrl;
};

const ChartList: React.FunctionComponent<PropsType> = ({
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
  const [chartLookupTable, setChartLookupTable] = useState<
    Record<string, string>
  >({});
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

      // filter charts based on the current view
      const filteredCharts = charts.filter((chart: ChartType) => {
        return (
          (currentView == "jobs" && chart.chart.metadata.name == "job") ||
          ((currentView == "applications" ||
            currentView == "cluster-dashboard") &&
            chart.chart.metadata.name != "job")
        );
      });

      let sortedCharts = filteredCharts;

      if (sortType == "Newest") {
        sortedCharts.sort((a: any, b: any) =>
          Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
            ? -1
            : 1
        );
      } else if (sortType == "Oldest") {
        sortedCharts.sort((a: any, b: any) =>
          Date.parse(a.info.last_deployed) > Date.parse(b.info.last_deployed)
            ? 1
            : -1
        );
      } else if (sortType == "Alphabetical") {
        sortedCharts.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
      }

      setIsError(false);
      return sortedCharts;
    } catch (error) {
      console.log(error);
      context.setCurrentError(JSON.stringify(error));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
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
        let chartKey = chartLookupTable[object.metadata.uid];

        // ignore if updated object does not belong to any chart in the list.
        if (!chartKey) {
          return;
        }

        let chartControllers = controllers[chartKey];
        chartControllers[object.metadata.uid] = object;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [chartKey]: chartControllers,
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

  const getControllerForChart = async (chart: ChartType) => {
    try {
      const { currentCluster, currentProject } = context;
      const res = await api.getChartControllers(
        "<token>",
        {
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: chart.name,
          revision: chart.version,
        }
      );

      let chartControllers = {} as Record<string, Record<string, any>>;

      res.data.forEach((c: any) => {
        c.metadata.kind = c.kind;
        chartControllers[c.metadata.uid] = c;
      });

      res.data.forEach(async (c: any) => {
        setChartLookupTable((oldChartLookupTable) => ({
          ...oldChartLookupTable,
          [c.metadata.uid]: `${chart.namespace}-${chart.name}`,
        }));
        setControllers((oldControllers) => ({
          ...oldControllers,
          [`${chart.namespace}-${chart.name}`]: chartControllers,
        }));
      });
    } catch (error) {
      context.setCurrentError(JSON.stringify(error));
    }
  };

  const getControllers = (charts: any[]) => {
    charts.forEach(async (chart: any) => {
      // don't retrieve controllers for chart that failed to even deploy.
      if (chart.info.status == "failed") return;
      await getControllerForChart(chart);
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

    return () => {
      closeAllWebsockets();
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    if (namespace || namespace === "") {
      updateCharts().then((charts) => {
        if (isSubscribed) {
          setCharts(charts);
          getControllers(charts);
        }
      });
    }
    return () => (isSubscribed = false);
  }, [namespace]);

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
    } else if (charts.length === 0) {
      return (
        <Placeholder>
          <i className="material-icons">category</i> No
          {currentView === "jobs" ? ` jobs` : ` charts`} found in this
          namespace.
        </Placeholder>
      );
    }

    return charts.map((chart: ChartType, i: number) => {
      return (
        <Chart
          key={`${chart.namespace}-${chart.name}`}
          chart={chart}
          controllers={
            controllers[`${chart.namespace}-${chart.name}`] ||
            ({} as Record<string, any>)
          }
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
  height: 320px;
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
  padding-bottom: 85px;
`;
