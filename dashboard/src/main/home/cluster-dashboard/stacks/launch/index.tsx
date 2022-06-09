import React from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import NewApp from "./NewApp";
import Overview from "./Overview";
import SelectSource from "./SelectSource";

const LaunchRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route path={`${path}/source`}>
        <SelectSource />
      </Route>
      <Route path={`${path}/overview`}>
        <Overview />
      </Route>
      <Route path={`${path}/new-app`}>
        <NewApp />
      </Route>
      <Route path={`*`}>
        <Redirect to={`${path}/source`} />
      </Route>
    </Switch>
  );
};

export default LaunchRoutes;
