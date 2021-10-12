import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import ProviderSelector from "../../components/ProviderSelector";
import { OFState } from "../../state";

import { State } from "./ProvisionResourcesState";
import FormFlowWrapper from "./forms/FormFlow";
import ConnectExternalCluster from "./forms/_ConnectExternalCluster";
import { SupportedProviders } from "../../types";

type Props = {
  provider: SupportedProviders | "external";
  project: {
    id: number;
    name: string;
  };
  shouldProvisionRegistry: boolean;
  onSelectProvider: (provider: SupportedProviders | "external") => void;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  onSkip: () => void;
};

const ProvisionResources: React.FC<Props> = ({
  provider,
  project,
  shouldProvisionRegistry,
  onSelectProvider,
  onSaveCredentials,
  onSaveSettings,
  onSuccess,
}) => {
  // const globalFormSnap = useSnapshot(OFState);
  // const { getQueryParam } = useRouting();
  // const location = useLocation();

  // useEffect(() => {
  //   const provider = getQueryParam("provider");
  //   if (provider === "aws" || provider === "gcp" || provider === "do") {
  //     State.selectedProvider = provider;
  //   }
  // }, [location]);

  // useEffect(() => {
  //   const connectedRegistry = globalFormSnap.StateHandler.connected_registry;
  //   State.shouldProvisionRegistry = !!connectedRegistry?.skip;
  // }, [globalFormSnap.StateHandler.connected_registry]);

  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 3 of 3</Subtitle>
      <Helper>
        Porter automatically creates a cluster and registry in your cloud to run
        applications.
      </Helper>
      {provider ? (
        provider !== "external" ? (
          <FormFlowWrapper nextStep={() => nextStep(false)} />
        ) : (
          <ConnectExternalCluster nextStep={onSuccess} project={project} />
        )
      ) : (
        <>
          <ProviderSelector
            selectProvider={(provider) => {
              onSelectProvider(provider);
            }}
            enableExternal={!shouldProvisionRegistry}
          />
        </>
      )}
    </>
  );
};

export default ProvisionResources;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;
