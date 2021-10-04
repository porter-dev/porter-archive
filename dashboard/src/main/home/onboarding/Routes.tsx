import React from "react";
import { Route, Switch, useRouteMatch } from "react-router";
import { useSnapshot } from "valtio";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import { NewProjectFC } from "./NewProject";
import { OnboardingState } from "./OnboardingState";
import Provisioner from "./Provisioner";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC />
        </Route>
        <Route path={`/onboarding/provision`}>
          <Provisioner />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
