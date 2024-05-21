import React, { useContext, useEffect, useState } from "react";
import loadable from "@loadable/component";
import { withRouter, type RouteComponentProps } from "react-router";
import { Route, Switch } from "react-router-dom";
import styled from "styled-components";

import Loading from "components/Loading";

import api from "shared/api";
import { withAuth, type WithAuthProps } from "shared/auth/AuthorizationHoc";
import GuardedRoute from "shared/auth/RouteGuard";
import { Context } from "shared/Context";
import { getQueryParam, pushQueryParams, type PorterUrl } from "shared/routing";
import { type ClusterType } from "shared/types";

import AppDashboard from "./apps/AppDashboard";
import DashboardRoutes from "./dashboard/Routes";
import EnvGroupDashboard from "./env-groups/EnvGroupDashboard";
import ExpandedEnvGroupDashboard from "./env-groups/ExpandedEnvGroupDashboard";
import ExpandedChartWrapper from "./expanded-chart/ExpandedChartWrapper";
import JobDashboard from "./jobs/JobDashboard";

const LazyPreviewEnvironmentsRoutes = loadable(
  // @ts-expect-error
  async () => await import("./preview-environments/routes.tsx"),
  {
    fallback: <Loading />,
  }
);

const LazyStackRoutes = loadable(
  // @ts-expect-error
  async () => await import("./stacks/routes.tsx"),
  {
    fallback: <Loading />,
  }
);

type Props = RouteComponentProps &
  WithAuthProps & {
    currentCluster: ClusterType;
    setSidebar: (x: boolean) => void;
    currentView: PorterUrl;
  };

// TODO: should try to maintain single source of truth b/w router and context/state (ex: namespace -> being managed in parallel right now so highly inextensible and routing is fragile)
const DashboardRouter: React.FC<Props> = ({
  setSidebar,
  currentView,
  ...props
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [namespace, setNamespace] = useState(null);
  const [sortType, setSortType] = useState(
    localStorage.getItem("SortType") || "Newest"
  );
  const [currentChart, setCurrentChart] = useState(null);
  const [isMetricsInstalled, setIsMetricsInstalled] = useState(false);

  useEffect(() => {
    // Don't add cluster as query param if present in path
    const { cluster } = props.match?.params as any;
    if (!cluster) {
      pushQueryParams(props, { cluster: currentCluster.name });
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
        setIsMetricsInstalled(true);
      })
      .catch(() => {
        setIsMetricsInstalled(false);
      });
  }, []);

  // Reset namespace filter and close expanded chart on cluster change
  useEffect(() => {
    let namespace = "default";
    const localStorageNamespace = localStorage.getItem(
      `${currentProject.id}-${currentCluster.id}-namespace`
    );
    if (localStorageNamespace) {
      namespace = localStorageNamespace;
    }
    setNamespace(namespace);
    setSortType(localStorage.getItem("SortType") || "Newest");
    setCurrentChart(null);

    // ret2
    pushQueryParams(props, { namespace });
  }, [currentCluster]);

  useEffect(() => {
    let { currentNamespace } =
      currentProject?.simplified_view_enabled &&
      currentProject?.capi_provisioner_enabled
        ? "porter-env-group"
        : (props.match?.params as any);
    if (!currentNamespace) {
      currentNamespace =
        currentProject?.simplified_view_enabled &&
        currentProject?.capi_provisioner_enabled
          ? "porter-env-group"
          : getQueryParam(props, "namespace");
    }
    setSortType("Newest");
    setCurrentChart(null);
    setNamespace(currentNamespace || "default");
    pushQueryParams(props, { namespace: currentNamespace || "default" });
  }, [currentView]);

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
          isMetricsInstalled={isMetricsInstalled}
        />
      </Route>
      <GuardedRoute
        path={"/applications"}
        scope="application"
        resource=""
        verb={["get", "list"]}
      >
        <AppDashboard
          currentView={currentView}
          namespace={namespace}
          setNamespace={setNamespace}
          sortType={sortType}
          setSortType={setSortType}
        />
      </GuardedRoute>
      <GuardedRoute
        path={"/jobs"}
        scope="job"
        resource=""
        verb={["get", "list"]}
      >
        <JobDashboard
          currentView={currentView}
          namespace={namespace}
          setNamespace={setNamespace}
          sortType={sortType}
        />
      </GuardedRoute>
      <GuardedRoute
        path={"/env-groups/:name"}
        scope="env_group"
        resource=""
        verb={["get", "list"]}
      >
        <ExpandedEnvGroupDashboard currentCluster={currentCluster} />
      </GuardedRoute>
      <GuardedRoute
        path={"/env-groups"}
        scope="env_group"
        resource=""
        verb={["get", "list"]}
      >
        <EnvGroupDashboard currentCluster={currentCluster} />
      </GuardedRoute>
      <Route path={["/cluster-dashboard"]}>
        <DashboardRoutes />
      </Route>
    </Switch>
  );
};

export default withRouter(withAuth(DashboardRouter));

const StyledTemplateComponent = styled.div``;
