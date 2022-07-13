import React from "react";
import { Route, Switch, useRouteMatch } from "react-router";

import ExpandedStack from "./ExpandedStack";
import NewAppResourceRoutes from "./NewAppResource";
import NewEnvGroup from "./NewEnvGroup";
import ExpandedStackStoreProvider from "./Store";

const ExpandedStackRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <ExpandedStackStoreProvider>
      <Switch>
        <Route path={`${path}/new-env-group`} exact>
          <NewEnvGroup />
        </Route>
        <Route path={`${path}/new-app-resource`}>
          <NewAppResourceRoutes />
        </Route>
        <Route path={`${path}/`} exact>
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
