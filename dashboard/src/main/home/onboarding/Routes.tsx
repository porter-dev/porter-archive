import React from "react";
import { Route, Switch } from "react-router";
import { NewProjectFC } from "./NewProject";
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
