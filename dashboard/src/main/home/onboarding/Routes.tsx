import React, { useContext } from "react";
import { Route, Switch } from "react-router";
import { Context } from "shared/Context";
import PorterErrorBoundary from "shared/error_handling/PorterErrorBoundary";
import { OFState } from "./state";
import ConnectRegistry from "./steps/ConnectRegistry/ConnectRegistry";
import ConnectSource from "./steps/ConnectSource";
import ProvisionResources from "./steps/ProvisionResources/ProvisionResources";

export const Routes = () => {
  const context = useContext(Context);
  const { currentProject } = context;

  return (
    <>
      <PorterErrorBoundary
        errorBoundaryLocation="onboarding"
        tags={{ scope: "onboarding" }}
      >
        <Switch>
          <Route path={`/onboarding/source/${currentProject}`}>
            <ConnectSource
              onSuccess={(data) => OFState.actions.nextStep("continue", data)}
            />
          </Route>
          <Route path={["/onboarding/registry/:step?"]}>
            <ConnectRegistry />
          </Route>
          <Route path={[`/onboarding/provision/:step?`]}>
            <PorterErrorBoundary
              errorBoundaryLocation="onboarding.provision_resources"
              tags={{ scope: "onboarding.provision_resources" }}
            >
              <ProvisionResources />
            </PorterErrorBoundary>
          </Route>
        </Switch>
      </PorterErrorBoundary>
    </>
  );
};

export default Routes;