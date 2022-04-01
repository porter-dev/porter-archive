import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import ConnectNewRepo from "./components/ConnectNewRepo";
import DeploymentDetail from "./deployments/DeploymentDetail";
import PreviewEnvironmentsHome from "./PreviewEnvironmentsHome";

export const Routes = () => {
  const { url } = useRouteMatch();
  const { currentProject } = useContext(Context);

  // if (!currentProject?.preview_envs_enabled) {
  //   return <Redirect to={`/`} />;
  // }

  return (
    <>
      <Switch>
        <Route path={`${url}/connect-repo`}>
          <ConnectNewRepo />
        </Route>
        <Route path={`${url}/details/:namespace`}>
          <DeploymentDetail />
        </Route>
        <Route path={`${url}/:selected_tab?`}>
          <PreviewEnvironmentsHome />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
