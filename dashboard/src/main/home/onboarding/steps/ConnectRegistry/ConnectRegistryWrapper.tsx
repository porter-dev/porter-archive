import React from "react";
import { useSnapshot } from "valtio";
import { OFState } from "../../state";
import ConnectRegistry from "./ConnectRegistry";

const ConnectRegistryWrapper = () => {
  const snap = useSnapshot(OFState);
  return (
    <ConnectRegistry
      provider={snap.StateHandler.connected_registry.provider}
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

export default ConnectRegistryWrapper;
