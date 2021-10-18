import React from "react";
import { Route, Switch } from "react-router";
import { OFState } from "./state";
import ConnectRegistryWrapper from "./steps/ConnectRegistry/ConnectRegistryWrapper";
import ConnectSource from "./steps/ConnectSource";
import ProvisionResourcesWrapper from "./steps/ProvisionResources/ProvisionResourcesWrapper";

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
          <ConnectRegistryWrapper />
        </Route>
        <Route path={[`/onboarding/provision/:step?`]}>
          <ProvisionResourcesWrapper />
        </Route>
      </Switch>
    </>
  );
};

export default Routes;
