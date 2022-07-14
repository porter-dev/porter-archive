import React from "react";
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  useRouteMatch,
} from "react-router";

import ExpandedStack from "./ExpandedStack";
import NewAppResourceRoutes from "./NewAppResource";
import NewEnvGroup from "./NewEnvGroup";
import ExpandedStackStoreProvider from "./Store";

const ExpandedStackRoutes = () => {
  const { path } = useRouteMatch();
  const { pathname } = useLocation();

  return (
    <ExpandedStackStoreProvider>
      <Switch>
        <Redirect from="/:url*(/+)" to={pathname.slice(0, -1)} />
        <Route path={`${path}/new-env-group`} exact>
          <NewEnvGroup />
        </Route>
        <Route path={`${path}/new-app-resource`}>
          <NewAppResourceRoutes />
        </Route>
        <Route path={`${path}`} exact>
          <ExpandedStack />
        </Route>
        <Route path={`*`}>
          <div>Not found</div>
        </Route>
      </Switch>
    </ExpandedStackStoreProvider>
  );
};

export default ExpandedStackRoutes;
