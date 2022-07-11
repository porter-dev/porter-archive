import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import ExpandedStack from "./ExpandedStack";
import NewEnvGroup from "./NewEnvGroup";

const ExpandedStackRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={`${path}/new-env-group`} exact>
        <NewEnvGroup />
      </Route>
      <Route path={`${path}/`} exact>
        <ExpandedStack />
      </Route>
      <Route path={`*`}>
        <div>Not found</div>
      </Route>
    </Switch>
  );
};

export default ExpandedStackRoutes;
