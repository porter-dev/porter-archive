import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import { Dashboard } from "./Dashboard";
import IncidentPage from "./incidents/IncidentPage";
import ExpandedNodeView from "./node-view/ExpandedNodeView";

export const Routes = () => {
  const { url } = useRouteMatch();
  const { currentProject } = useContext(Context);
  return (
    <>
      <Switch>
        <Route path={`${url}/incidents/:incident_id`}>
          <IncidentPage />
        </Route>
        <Route path={`${url}/node-view/:nodeId`}>
          <ExpandedNodeView />
        </Route>
        <Route path={`${url}/`}>
          <Dashboard />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
