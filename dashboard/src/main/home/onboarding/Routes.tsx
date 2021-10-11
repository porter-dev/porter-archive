import React from "react";
import { Route, Switch } from "react-router";
import ConnectRegistry from "./steps/ConnectRegistry/ConnectRegistry";
import ConnectSource from "./steps/ConnectSource";
import { NewProjectFC } from "./steps/NewProject";
import ProvisionResources from "./steps/ProvisionResources/ProvisionResources";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC />
        </Route>
        <Route path={`/onboarding/source`}>
          <ConnectSource />
        </Route>
        <Route path={`/onboarding/registry`}>
          <ConnectRegistry />
        </Route>
        <Route path={`/onboarding/provision`}>
          <ProvisionResources />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
