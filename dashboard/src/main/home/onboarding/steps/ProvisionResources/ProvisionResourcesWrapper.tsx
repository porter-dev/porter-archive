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
      onSelectProvider={(provider) =>
        OFState.actions.nextStep("continue", provider)
      }
      onSaveCredentials={(data) => OFState.actions.nextStep("continue", data)}
      onSaveSettings={(data) => OFState.actions.nextStep("continue", data)}
      onSuccess={() => OFState.actions.nextStep("continue")}
      onSkip={() => OFState.actions.nextStep("skip")}
    />
  );
};

export default ProvisionResourcesWrapper;
