import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import Dashboard from "./Dashboard";
import ExpandedStackRoutes from "./ExpandedStack/routes";
import LaunchRoutes from "./launch";

const routes = () => {
  const { path } = useRouteMatch();
  const { currentProject } = useContext(Context);

  if (!currentProject?.stacks_enabled) {
    return <Redirect to={`/`} />;
  }

  return (
    <Switch>
      <Route path={`${path}/launch`}>
        <LaunchRoutes />
      </Route>
      <Route path={`${path}/:namespace/:stack_id`}>
        <ExpandedStackRoutes />
      </Route>
      <Route path={`${path}`} exact>
        <Dashboard />
      </Route>
      <Route path={`*`}>
        <div>Not found</div>
      </Route>
    </Switch>
  );
};

export default routes;
