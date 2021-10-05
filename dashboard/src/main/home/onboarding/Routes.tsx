import React from "react";
import { Route, Switch } from "react-router";
import { NewProjectFC } from "./NewProject";
import ProvisionerForms from "./ProvisionerForms";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC />
        </Route>
        <Route path={`/onboarding/provision`}>
          <ProvisionerForms />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
