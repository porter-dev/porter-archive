import React, { Component } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import PageNotFound from "components/PageNotFound";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import {
  type ChartType,
  type ChartTypeWithExtendedConfig,
} from "shared/types";

import ExpandedChart from "./ExpandedChart";
import ExpandedJobChart from "./ExpandedJobChart";

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
    const { match } = this.props;
    const { namespace, chartName } = match.params as any;
    const { currentProject, currentCluster } = this.context;
    if (currentProject && currentCluster) {
      api
        .getChart<ChartTypeWithExtendedConfig>(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace,
            cluster_id: currentCluster.id,
            name: chartName,
            revision: 0,
          }
        )
        .then((res) => {
          const chart = res.data;
          this.setState({ currentChart: res.data, loading: false });
          const isJob = res.data.form?.name?.toLowerCase() === "job";
          const route = `${isJob ? "/jobs" : "/applications"}/${
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
    const { setSidebar, location, match } = this.props;
    const { baseRoute, namespace } = match.params as any;
    const { loading, currentChart } = this.state;

    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (currentChart && baseRoute === "jobs") {
      return (
        <ExpandedJobChart
          namespace={namespace}
          currentChart={currentChart}
          currentCluster={this.context.currentCluster}
          closeChart={() => {
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.get("closeChartRedirectUrl")) {
              this.props.history.push(urlParams.get("closeChartRedirectUrl"));
              return;
            }

            pushFiltered(this.props, "/jobs", ["project_id"], {
              cluster: this.context.currentCluster.name,
              namespace,
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
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.get("closeChartRedirectUrl")) {
              this.props.history.push(urlParams.get("closeChartRedirectUrl"));
              return;
            }

            pushFiltered(this.props, "/applications", ["project_id"], {
              cluster: this.context.currentCluster.name,
              namespace,
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
