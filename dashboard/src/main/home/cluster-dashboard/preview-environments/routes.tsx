import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import ConnectNewRepo from "./ConnectNewRepo";
import DeploymentDetail from "./deployments/DeploymentDetail";
import DeploymentList from "./deployments/DeploymentList";
import EnvironmentsList from "./environments/EnvironmentsList";

export const Routes = () => {
  const { path } = useRouteMatch();
  const { currentProject } = useContext(Context);

  if (!currentProject?.preview_envs_enabled) {
    return <Redirect to={`/`} />;
  }

  return (
    <>
      <Switch>
        <Route path={`${path}/connect-repo`}>
          <ConnectNewRepo />
        </Route>
        <Route path={`${path}/details/:namespace?`}>
          <DeploymentDetail />
        </Route>
        <Route
          path={`${path}/deployments/:environment_id/:repo_owner/:repo_name`}
        >
          <DeploymentList />
        </Route>
        <Route path={`${path}/`}>
          <EnvironmentsList />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
