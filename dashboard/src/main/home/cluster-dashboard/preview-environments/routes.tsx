import React, { useContext } from "react";
import { Redirect, Route, Switch, useRouteMatch } from "react-router";
import { Context } from "shared/Context";
import EnvironmentDetail from "./EnvironmentDetail";
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
        <Route path={`${url}/details/:namespace`}>
          <EnvironmentDetail />
        </Route>
        <Route path={`${url}/`}>
          <PreviewEnvironmentsHome />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
