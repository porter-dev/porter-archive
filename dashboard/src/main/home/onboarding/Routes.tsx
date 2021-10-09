import React from "react";
import { Route, Switch } from "react-router";
import ConnectRegistry from "./steps/ConnectRegistry/ConnectRegistry";
import ConnectSource from "./steps/ConnectSource";
import { NewProjectFC } from "./steps/NewProject";
import ProvisionerForms from "./ProvisionerForms";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC />
        </Route>
        <Route path={`/onboarding/integrations`}>
          <ConnectSource />
        </Route>
        <Route path={`/onboarding/registry`}>
          <ConnectRegistry />
        </Route>
        <Route path={`/onboarding/provision`}>
          <ProvisionerForms />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
