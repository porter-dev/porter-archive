import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useState } from "react";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import ProviderSelector from "../../components/ProviderSelector";
import { OFState } from "../../state";
import { SupportedProviders } from "../../types";

import { State } from "./ConnectRegistryState";
import FormFlowWrapper from "./forms/FormFlow";

const ConnectRegistry = () => {
  const snap = useSnapshot(State);
  const { pushFiltered } = useRouting();
  const [selectedProvider, setSelectedProvider] = useState<
    SupportedProviders | ""
  >("");

  const nextStep = (skipped: boolean) => {
    if (skipped) {
      OFState.actions.nextStep({
        skip: true,
      });
      return;
    }
    OFState.actions.nextStep({
      skip: false,
      provider: selectedProvider,
      credentials: snap.config.credentials,
      settings: snap.config.settings,
    });
  };

  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 2 of 3</Subtitle>
      <Helper>
        {snap.selectedProvider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is"
          : "Link to an existing docker registry or continue"}
      </Helper>
      {snap.selectedProvider ? (
        <FormFlowWrapper nextStep={() => nextStep(false)} />
      ) : (
        <>
          <ProviderSelector
            selectProvider={(provider) => {
              State.selectedProvider = provider;
            }}
          />
          <NextStep
            text="Continue"
            disabled={false}
            onClick={() => nextStep(true)}
            status={""}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
          />
        </>
      )}
    </>
  );
};

export default ConnectRegistry;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;
