import React from "react";
import { useSnapshot } from "valtio";
import { OFState } from "../../state";
import ProvisionResources from "./ProvisionResources";

const ProvisionResourcesWrapper = () => {
  const snap = useSnapshot(OFState);
  return (
    <ProvisionResources
      shouldProvisionRegistry={snap.StateHandler.connected_registry?.skip}
      provider={snap.StateHandler.provision_resources?.provider}
      project={snap.StateHandler.project}
      onSelectProvider={(provider: string) => {
        if (provider !== "external") {
          OFState.actions.nextStep("continue", provider);
          return;
        }
        OFState.actions.nextStep("skip");
      }}
      onSaveCredentials={(data) => OFState.actions.nextStep("continue", data)}
      onSaveSettings={(data) => OFState.actions.nextStep("continue", data)}
      onSuccess={() => OFState.actions.nextStep("continue")}
      onSkip={() => OFState.actions.nextStep("skip")}
      enable_go_back={snap.StepHandler.canGoBack}
      goBack={() => OFState.actions.nextStep("go_back")}
    />
  );
};

export default ProvisionResourcesWrapper;
