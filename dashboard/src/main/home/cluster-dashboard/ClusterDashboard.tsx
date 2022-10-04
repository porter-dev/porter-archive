import React, { Component } from "react";
import styled from "styled-components";
import monojob from "assets/monojob.png";
import monoweb from "assets/monoweb.png";
import { Route, Switch } from "react-router-dom";

import { Context } from "shared/Context";
import { ChartType, ClusterType, JobStatusType } from "shared/types";
import {
  getQueryParam,
  PorterUrl,
  pushFiltered,
  pushQueryParams,
} from "shared/routing";

import DashboardHeader from "./DashboardHeader";
import ChartList from "./chart/ChartList";
import EnvGroupDashboard from "./env-groups/EnvGroupDashboard";
import { NamespaceSelector } from "./NamespaceSelector";
import SortSelector from "./SortSelector";
import ExpandedChartWrapper from "./expanded-chart/ExpandedChartWrapper";
import { RouteComponentProps, withRouter } from "react-router";

import api from "shared/api";
import DashboardRoutes from "./dashboard/Routes";
import GuardedRoute from "shared/auth/RouteGuard";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";
import LastRunStatusSelector from "./LastRunStatusSelector";
import loadable from "@loadable/component";
import Loading from "components/Loading";
import JobRunTable from "./chart/JobRunTable";
import TagFilter from "./TagFilter";

// @ts-ignore
const LazyDatabasesRoutes = loadable(() => import("./databases/routes.tsx"), {
  fallback: <Loading />,
});

const LazyPreviewEnvironmentsRoutes = loadable(
  // @ts-ignore
  () => import("./preview-environments/routes.tsx"),
  {
    fallback: <Loading />,
  }
);

const LazyStackRoutes = loadable(
  // @ts-ignore
  () => import("./stacks/routes.tsx"),
  {
    fallback: <Loading />,
  }
);

type PropsType = RouteComponentProps &
  WithAuthProps & {
    currentCluster: ClusterType;
    setSidebar: (x: boolean) => void;
    currentView: PorterUrl;
  };

type StateType = {
  namespace: string;
  sortType: string;
  lastRunStatus: JobStatusType | null;
  currentChart: ChartType | null;
  isMetricsInstalled: boolean;
  showRuns: boolean;
  selectedTag: any;
};

// TODO: should try to maintain single source of truth b/w router and context/state (ex: namespace -> being managed in parallel right now so highly inextensible and routing is fragile)
class ClusterDashboard extends Component<PropsType, StateType> {
  state = {
    namespace: null as string,
    sortType: localStorage.getItem("SortType")
      ? localStorage.getItem("SortType")
      : "Newest",
    lastRunStatus: "all" as null,
    currentChart: null as ChartType | null,
    isMetricsInstalled: false,
    showRuns: false,
    selectedTag: "none",
  };

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    let params = this.props.match.params as any;
    let pathClusterName = params.cluster;
    // Don't add cluster as query param if present in path
    if (!pathClusterName) {
      pushQueryParams(this.props, { cluster: currentCluster.name });
    }
    api
      .getPrometheusIsInstalled(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({ isMetricsInstalled: true });
      })
      .catch(() => {
        this.setState({ isMetricsInstalled: false });
      });
  }

  componentDidUpdate(prevProps: PropsType) {
    // Reset namespace filter and close expanded chart on cluster change
    if (prevProps.currentCluster !== this.props.currentCluster) {
      this.setState(
        {
          namespace: "default",
          sortType: localStorage.getItem("SortType")
            ? localStorage.getItem("SortType")
            : "Newest",
          currentChart: null,
        },
        () => pushQueryParams(this.props, { namespace: "default" })
      );
    }
    if (prevProps.currentView !== this.props.currentView) {
      let params = this.props.match.params as any;
      let currentNamespace = params.namespace;
      if (!currentNamespace) {
        currentNamespace = getQueryParam(this.props, "namespace");
      }
      this.setState(
        {
          sortType: "Newest",
          currentChart: null,
          namespace: currentNamespace || "default",
        },
        () =>
          pushQueryParams(this.props, {
            namespace:
              this.state.namespace === null ? "default" : this.state.namespace,
          })
      );
    }
  }

  renderCommonFilters = () => {
    const { currentView } = this.props;

    return (
      <>
        <NamespaceSelector
          setNamespace={(namespace) =>
            this.setState({ namespace }, () => {
              console.log(window.location, namespace);
              pushQueryParams(this.props, {
                namespace: this.state.namespace || "ALL",
              });
            })
          }
          namespace={this.state.namespace}
        />
        <TagFilter
          onSelect={(newSelectedTag) =>
            this.setState({ selectedTag: newSelectedTag })
          }
        />
      </>
    );
  };

  renderBodyForApps = () => {
    let { currentCluster, currentView } = this.props;
    const isAuthorizedToAdd = this.props.isAuthorized(
      "namespace",
      [],
      ["get", "create"]
    );

    return (
      <>
        <ControlRow>
          <FilterWrapper>{this.renderCommonFilters()}</FilterWrapper>
          <Flex>
            <SortSelector
              setSortType={(sortType) => this.setState({ sortType })}
              sortType={this.state.sortType}
              currentView={currentView}
            />
            {isAuthorizedToAdd && (
              <Button
                onClick={() =>
                  pushFiltered(this.props, "/launch", ["project_id"])
                }
              >
                <i className="material-icons">add</i> Launch template
              </Button>
            )}
          </Flex>
        </ControlRow>

        <ChartList
          currentView={currentView}
          currentCluster={currentCluster}
          lastRunStatus={this.state.lastRunStatus}
          namespace={this.state.namespace}
          sortType={this.state.sortType}
          selectedTag={this.state.selectedTag}
        />
      </>
    );
  };

  renderBodyForJobs = () => {
    let { currentCluster, currentView } = this.props;
    const isAuthorizedToAdd = this.props.isAuthorized(
      "namespace",
      [],
      ["get", "create"]
    );

    return (
      <>
        <ControlRow style={{ marginTop: "35px" }}>
          <FilterWrapper>
            <LastRunStatusSelector
              lastRunStatus={this.state.lastRunStatus}
              setLastRunStatus={(lastRunStatus: JobStatusType) => {
                this.setState({ lastRunStatus });
              }}
            />
            {this.renderCommonFilters()}
          </FilterWrapper>
          <Flex>
            <ToggleButton>
              <ToggleOption
                onClick={() => this.setState({ showRuns: false })}
                selected={!this.state.showRuns}
              >
                Jobs
              </ToggleOption>
              <ToggleOption
                nudgeLeft
                onClick={() => this.setState({ showRuns: true })}
                selected={this.state.showRuns}
              >
                Runs
              </ToggleOption>
            </ToggleButton>
            {isAuthorizedToAdd && (
              <Button
                onClick={() =>
                  pushFiltered(this.props, "/launch", ["project_id"])
                }
              >
                <i className="material-icons">add</i> Launch template
              </Button>
            )}
          </Flex>
        </ControlRow>
        <HidableElement show={this.state.showRuns}>
          <JobRunTable
            lastRunStatus={this.state.lastRunStatus}
            namespace={this.state.namespace}
            sortType={this.state.sortType as any}
          />
        </HidableElement>
        <HidableElement show={!this.state.showRuns}>
          <ChartList
            currentView={currentView}
            currentCluster={currentCluster}
            lastRunStatus={this.state.lastRunStatus}
            namespace={this.state.namespace}
            sortType={this.state.sortType}
            selectedTag={this.state.selectedTag}
          />
        </HidableElement>
      </>
    );
  };

  render() {
    let { currentView } = this.props;
    let { setSidebar } = this.props;
    return (
      <Switch>
        <Route path={"/stacks"}>
          <LazyStackRoutes />
        </Route>
        <Route path={"/preview-environments"}>
          <LazyPreviewEnvironmentsRoutes />
        </Route>
        <Route path="/:baseRoute/:clusterName+/:namespace/:chartName">
          <ExpandedChartWrapper
            setSidebar={setSidebar}
            isMetricsInstalled={this.state.isMetricsInstalled}
          />
        </Route>
        <GuardedRoute
          path={"/jobs"}
          scope="job"
          resource=""
          verb={["get", "list"]}
        >
          <DashboardHeader
            image={monojob}
            title={currentView}
            description="Scripts and tasks that run once or on a repeating interval."
            disableLineBreak
          />

          {this.renderBodyForJobs()}
        </GuardedRoute>
        <GuardedRoute
          path={"/applications"}
          scope="application"
          resource=""
          verb={["get", "list"]}
        >
          <DashboardHeader
            image={monoweb}
            title={currentView}
            description="Continuously running web services, workers, and add-ons."
            disableLineBreak
          />

          {this.renderBodyForApps()}
        </GuardedRoute>
        <GuardedRoute
          path={"/env-groups"}
          scope="env_group"
          resource=""
          verb={["get", "list"]}
        >
          <EnvGroupDashboard currentCluster={this.props.currentCluster} />
        </GuardedRoute>
        <Route path={"/databases"}>
          <LazyDatabasesRoutes />
        </Route>
        <Route path={["/cluster-dashboard"]}>
          <DashboardRoutes />
        </Route>
      </Switch>
    );
  }
}

ClusterDashboard.contextType = Context;

export default withRouter(withAuth(ClusterDashboard));

const ToggleOption = styled.div<{ selected: boolean; nudgeLeft?: boolean }>`
  padding: 0 10px;
  color: ${(props) => (props.selected ? "" : "#494b4f")};
  border: 1px solid #494b4f;
  height: 100%;
  display: flex;
  margin-left: ${(props) => (props.nudgeLeft ? "-1px" : "")};
  align-items: center;
  border-radius: ${(props) =>
    props.nudgeLeft ? "0 5px 5px 0" : "5px 0 0 5px"};
  :hover {
    border: 1px solid #7a7b80;
    z-index: 999;
  }
`;

const ToggleButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  font-size: 13px;
  height: 30px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const HidableElement = styled.div<{ show: boolean }>`
  display: ${(props) => (props.show ? "unset" : "none")};
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 30px solid transparent;
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 10px;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  min-width: 155px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const FilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 30px solid transparent;
  > div:not(:first-child) {
  }
`;
