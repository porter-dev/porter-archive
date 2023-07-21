import React, { useContext, useState } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import { Dashboard } from "./Dashboard";
import PorterAppDashboard from "./PorterAppDashboard"
import ExpandedNodeView from "./node-view/ExpandedNodeView";

export const Routes = () => {
  const { url } = useRouteMatch();
  const { currentProject } = useContext(Context);
  const [forceRefreshClusters, setForceRefreshClusters] = useState(false);

  return (
    <>
      <Switch>
        <Route path={`${url}/node-view/:nodeId`}>
          <ExpandedNodeView />
        </Route>
        <Route path={`${url}/info`}>
          <Dashboard />
        </Route>
        <Route path={`${url}/`}>
          <PorterAppDashboard projectId={currentProject.id} setRefreshClusters={setForceRefreshClusters} />
        </Route>

      </Switch>
    </>
  );
};

export default Routes;
