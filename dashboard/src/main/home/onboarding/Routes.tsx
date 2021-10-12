import React from "react";
import { Route, Switch } from "react-router";
import { useSnapshot } from "valtio";
import { OFState } from "./state";
import ConnectRegistry from "./steps/ConnectRegistry/ConnectRegistry";
import ConnectRegistryWrapper from "./steps/ConnectRegistry/ConnectRegistryWrapper";
import ConnectSource from "./steps/ConnectSource";
import { NewProjectFC } from "./steps/NewProject";
import ProvisionResources from "./steps/ProvisionResources/ProvisionResources";
import ProvisionResourcesWrapper from "./steps/ProvisionResources/ProvisionResourcesWrapper";

const handleContinue = (data?: any) => {
  OFState.actions.nextStep("continue", data);
};

const handleSkip = () => {
  OFState.actions.nextStep("skip");
};

export const Routes = () => {
  const snap = useSnapshot(OFState);
  return (
    <>
      <Switch>
        <Route path={`/onboarding/new-project`}>
          <NewProjectFC
            onSuccess={(data) => OFState.actions.nextStep("continue", data)}
          />
        </Route>
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
