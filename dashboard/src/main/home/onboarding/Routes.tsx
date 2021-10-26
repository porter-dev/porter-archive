import React from "react";
import { Route, Switch } from "react-router";
import { OFState } from "./state";
import ConnectRegistry from "./steps/ConnectRegistry/ConnectRegistry";
import ConnectSource from "./steps/ConnectSource";
import ProvisionResources from "./steps/ProvisionResources/ProvisionResources";

export const Routes = () => {
  return (
    <>
      <Switch>
        <Route path={`/onboarding/source`}>
          <ConnectSource
            onSuccess={(data) => OFState.actions.nextStep("continue", data)}
          />
        </Route>
        <Route path={["/onboarding/registry/:step?"]}>
          <ConnectRegistry />
        </Route>
        <Route path={[`/onboarding/provision/:step?`]}>
          <ProvisionResources />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
