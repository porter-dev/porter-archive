import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { RouteComponentProps, withRouter } from "react-router";

import {
  ChartType,
  ChartTypeWithExtendedConfig,
  StorageType,
} from "shared/types";
import api from "shared/api";
import { getQueryParam, pushFiltered } from "shared/routing";
import { ExpandedJobChartFC } from "./ExpandedJobChart";
import ExpandedChart from "./ExpandedChart";
import Loading from "components/Loading";
import PageNotFound from "components/PageNotFound";

type PropsType = RouteComponentProps<{
  baseRoute: string;
  namespace: string;
}> & {
  setSidebar: (x: boolean) => void;
  isMetricsInstalled: boolean;
};

type StateType = {
  loading: boolean;
  currentChart: ChartType;
};

class ExpandedChartWrapper extends Component<PropsType, StateType> {
  state = {
    loading: true,
    currentChart: null as ChartType,
  };

  // Retrieve full chart data (includes form and values)
  getChartData = () => {
    let { match } = this.props;
    let { namespace, chartName } = match.params as any;
    let { currentProject, currentCluster } = this.context;
    if (currentProject && currentCluster) {
      api
        .getChart<ChartTypeWithExtendedConfig>(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: namespace,
            cluster_id: currentCluster.id,
            name: chartName,
            revision: 0,
          }
        )
        .then((res) => {
          const chart = res.data;
          this.setState({ currentChart: res.data, loading: false });
          const isJob = res.data.form?.name?.toLowerCase() === "job";
          let route = `${isJob ? "/jobs" : "/applications"}/${
            currentCluster.name
          }/${chart.namespace}/${chart.name}`;

          if (isJob && this.props.match.params?.baseRoute === "applications") {
            pushFiltered(this.props, route, [
              "project_id",
              "closeChartRedirectUrl",
            ]);
            return;
          }

          if (!isJob && this.props.match.params?.baseRoute !== "applications") {
            pushFiltered(this.props, route, [
              "project_id",
              "closeChartRedirectUrl",
            ]);
            return;
          }
        })
        .catch((err) => {
          console.log(err);
          console.log("err", err?.response?.data);
          this.setState({ loading: false });
        });
    }
  };

  componentDidMount() {
    this.setState({ loading: true });
    this.getChartData();
  }

  render() {
    let { setSidebar, location, match } = this.props;
    let { baseRoute, namespace } = match.params as any;
    let { loading, currentChart } = this.state;

    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (currentChart && baseRoute === "jobs") {
      return (
        <ExpandedJobChartFC
          namespace={namespace}
          currentChart={currentChart}
          currentCluster={this.context.currentCluster}
          closeChart={() => {
            let urlParams = new URLSearchParams(window.location.search);

            if (urlParams.get("closeChartRedirectUrl")) {
              this.props.history.push(urlParams.get("closeChartRedirectUrl"));
              return;
            }

            pushFiltered(this.props, "/jobs", ["project_id"], {
              cluster: this.context.currentCluster.name,
              namespace: namespace,
            });
          }}
          setSidebar={setSidebar}
        />
      );
    } else if (currentChart && baseRoute === "applications") {
      return (
        <ExpandedChart
          namespace={namespace}
          isMetricsInstalled={this.props.isMetricsInstalled}
          currentChart={currentChart}
          currentCluster={this.context.currentCluster}
          closeChart={() => {
            let urlParams = new URLSearchParams(window.location.search);

            if (urlParams.get("closeChartRedirectUrl")) {
              this.props.history.push(urlParams.get("closeChartRedirectUrl"));
              return;
            }

            pushFiltered(this.props, "/applications", ["project_id"], {
              cluster: this.context.currentCluster.name,
              namespace: namespace,
            });
          }}
          setSidebar={setSidebar}
        />
      );
    }
    return <PageNotFound />;
  }
}

ExpandedChartWrapper.contextType = Context;

export default withRouter(ExpandedChartWrapper);

const LoadingWrapper = styled.div`
  width: 100%;
  height: 100vh;
`;
