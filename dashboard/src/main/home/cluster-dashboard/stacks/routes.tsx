import React, { useContext } from "react";
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  useRouteMatch,
} from "react-router";
import { Context } from "shared/Context";
import Dashboard from "./Dashboard";
import ExpandedStack from "./ExpandedStack/ExpandedStack";
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
        <ExpandedStack />
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
