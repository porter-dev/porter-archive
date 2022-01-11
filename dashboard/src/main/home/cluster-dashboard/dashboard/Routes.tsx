import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import { Dashboard } from "./Dashboard";
import ExpandedNodeView from "./node-view/ExpandedNodeView";
import EnvironmentDetail from "./preview-environments/EnvironmentDetail";

export const Routes = () => {
  const { url } = useRouteMatch();
  const { currentProject } = useContext(Context);
  return (
    <>
      <Switch>
        <Route path={`${url}/node-view/:nodeId`}>
          <ExpandedNodeView />
        </Route>
        <Route
          path={`${url}/pr-env-detail/:namespace`}
          render={() => {
            if (currentProject.preview_envs_enabled) {
              return <EnvironmentDetail />;
            }
            return <Redirect to={`${url}/`} />;
          }}
        ></Route>
        <Route path={`${url}/`}>
          <Dashboard />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
