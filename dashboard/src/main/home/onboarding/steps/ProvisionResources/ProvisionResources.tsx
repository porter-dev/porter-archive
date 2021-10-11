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
import { SupportedProviders } from "../../types";

import { State } from "./ProvisionResourcesState";
import FormFlowWrapper from "./forms/FormFlow";

const ProvisionResources = () => {
  const snap = useSnapshot(State);
  const { getQueryParam } = useRouting();
  const location = useLocation();

  useEffect(() => {
    const provider = getQueryParam("provider");
    if (provider === "aws" || provider === "gcp" || provider === "do") {
      State.selectedProvider = provider;
    }
  }, [location]);

  const nextStep = (skipped: boolean) => {
    if (skipped) {
      OFState.actions.nextStep({
        skip: true,
      });
      return;
    }
    OFState.actions.nextStep({
      skip: false,
      provider: snap.selectedProvider,
      credentials: snap.config.credentials,
      settings: snap.config.settings,
    });
  };

  return (
    <>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 3 of 3</Subtitle>
      <Helper>
        Porter automatically creates a cluster and registry in your cloud to run
        applications.
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
            text="Skip step"
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

export default ProvisionResources;

const Subtitle = styled(TitleSection)`
  font-size: 16px;
  margin-top: 16px;
`;

const NextStep = styled(SaveButton)`
  margin-top: 24px;
`;
