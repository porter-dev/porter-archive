import React from "react";
import { Route, Switch, useRouteMatch } from "react-router";
import { useSnapshot } from "valtio";
import ProvisionerSettings from "../provisioner/ProvisionerSettings";
import { NewProjectFC } from "./NewProject";
import { OnboardingState } from "./OnboardingState";

export const Routes = () => {
  const snap = useSnapshot(OnboardingState);

  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC />
        </Route>
        <Route path={`/onboarding/provision`}>
          <ProvisionerSettings
            isInNewProject={true}
            projectName={snap.projectName}
            provisioner={snap.isProvisionerEnabled}
          />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
