import React from "react";
import { Route, Switch, useLocation, useRouteMatch } from "react-router";
import Dashboard from "./Dashboard";
import LaunchRoutes from "./launch";

const routes = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={`${path}/launch`}>
        <LaunchRoutes />
      </Route>
      <Route path={`${path}/`} exact>
        <Dashboard />
      </Route>
      <Route path={`*`}>
        <div>Not found</div>
      </Route>
    </Switch>
  );
};

export default routes;
