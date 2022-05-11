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
import NamespaceSelector from "./NamespaceSelector";
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
import SwitchBase from "@material-ui/core/internal/SwitchBase";
import Selector from "components/Selector";
import TabSelector from "components/TabSelector";
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
        <TagFilter
          onSelect={(newSelectedTag) =>
            this.setState({ selectedTag: newSelectedTag })
          }
        />
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
        <SortSelector
          setSortType={(sortType) => this.setState({ sortType })}
          sortType={this.state.sortType}
          currentView={currentView}
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
          {isAuthorizedToAdd && (
            <Button
              onClick={() =>
                pushFiltered(this.props, "/launch", ["project_id"])
              }
            >
              <i className="material-icons">add</i> Launch Template
            </Button>
          )}
          <SortFilterWrapper>{this.renderCommonFilters()}</SortFilterWrapper>
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
        <TabSelector
          currentTab={this.state.showRuns ? "job_runs" : "chart_list"}
          options={[
            { label: "Jobs", value: "chart_list" },
            { label: "Runs", value: "job_runs" },
          ]}
          setCurrentTab={(value) => {
            if (value === "job_runs") {
              this.setState({ showRuns: true });
            } else {
              this.setState({ showRuns: false });
            }
          }}
        />
        <ControlRow style={{ marginTop: "35px" }}>
          {isAuthorizedToAdd && (
            <Button
              onClick={() =>
                pushFiltered(this.props, "/launch", ["project_id"])
              }
            >
              <i className="material-icons">add</i> Launch Template
            </Button>
          )}
          <SortFilterWrapper>
            <LastRunStatusSelector
              lastRunStatus={this.state.lastRunStatus}
              setLastRunStatus={(lastRunStatus: JobStatusType) => {
                this.setState({ lastRunStatus });
              }}
            />
            {this.renderCommonFilters()}
          </SortFilterWrapper>
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

const HidableElement = styled.div<{ show: boolean }>`
  display: ${(props) => (props.show ? "unset" : "none")};
`;

const Br = styled.div`
  width: 100%;
  height: 1px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding-left: 0px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 2px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #7a838f;
  font-size: 13px;
  > i {
    color: #8b949f;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const InfoSection = styled.div`
  margin-top: 20px;
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
  margin-bottom: 35px;
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  margin-bottom: 35px;
  padding: 0px 8px;
  min-width: 155px;
  padding-bottom: 1px;
  margin-right: 10px;
  font-weight: 500;
  padding-right: 15px;
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

const ButtonAlt = styled(Button)`
  min-width: 150px;
  max-width: 150px;
  background: #7a838fdd;

  :hover {
    background: #69727eee;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const Overlay = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  background: #00000028;
  top: 0;
  left: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  color: white;
`;

const DashboardImage = styled.img`
  height: 45px;
  width: 45px;
  border-radius: 5px;
`;

const DashboardIcon = styled.div`
  position: relative;
  height: 45px;
  min-width: 45px;
  width: 45px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #676c7c;
  border: 2px solid #8e94aa;

  > i {
    font-size: 22px;
  }
`;

const Img = styled.img`
  width: 30px;
`;

const SortFilterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 35px;
  > div:not(:first-child) {
    margin-left: 30px;
  }
`;