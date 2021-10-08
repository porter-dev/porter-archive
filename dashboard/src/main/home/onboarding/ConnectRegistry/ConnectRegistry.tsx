import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React from "react";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import ProviderSelector from "../components/ProviderSelector";

import { State } from "./ConnectRegistryState";
import FormFlowWrapper from "./forms/FormFlow";

const ConnectRegistry = () => {
  const snap = useSnapshot(State);
  const { pushFiltered } = useRouting();
  const nextStep = () => {
    console.log("Good work boy!");
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
        <FormFlowWrapper nextStep={nextStep} />
      ) : (
        <>
          <ProviderSelector selectProvider={State.actions.selectProvider} />
          <NextStep
            text="Continue"
            disabled={false}
            onClick={nextStep}
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
