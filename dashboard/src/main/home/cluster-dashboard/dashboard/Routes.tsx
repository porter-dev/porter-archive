import React from "react";
import { Route, Switch, useRouteMatch } from "react-router";
import { Dashboard } from "./Dashboard";
import ExpandedNodeView from "./node-view/ExpandedNodeView";

export const Routes = () => {
  const { url } = useRouteMatch();
  return (
    <>
      <Switch>
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
