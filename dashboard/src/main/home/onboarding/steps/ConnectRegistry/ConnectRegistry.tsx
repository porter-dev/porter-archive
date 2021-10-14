import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useState } from "react";
import { useParams } from "react-router";

import styled from "styled-components";
import ProviderSelector from "../../components/ProviderSelector";
import { SupportedProviders } from "../../types";
import backArrow from "assets/back_arrow.png";

import FormFlowWrapper from "./forms/FormFlow";

const ConnectRegistry: React.FC<{
  provider: SupportedProviders;
  enable_go_back: boolean;
  project: {
    id: number;
    name: string;
  };
  onSelectProvider: (provider: SupportedProviders) => void;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  onSkip: () => void;
  goBack: () => void;
}> = ({
  onSelectProvider,
  onSaveCredentials,
  onSaveSettings,
  onSuccess,
  onSkip,
  project,
  provider,
  enable_go_back,
  goBack,
}) => {
  const { step } = useParams<any>();

  return (
    <>
      {enable_go_back && (
        <BackButton
          onClick={() => {
            goBack();
          }}
        >
          <BackButtonImg src={backArrow} />
        </BackButton>
      )}
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 2 of 3 - Connect an Existing Registry (Optional)</Subtitle>
      <Helper>
        {provider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is"
          : "Link to an existing docker registry or continue"}
      </Helper>
      {provider ? (
        <FormFlowWrapper
          provider={provider}
          onSaveCredentials={onSaveCredentials}
          onSaveSettings={onSaveSettings}
          onSuccess={onSuccess}
          project={project}
          currentStep={step}
        />
      ) : (
        <>
          <ProviderSelector
            selectProvider={(provider) => {
              if (provider !== "external") {
                onSelectProvider(provider);
              }
            }}
          />
          <NextStep
            text="Skip step"
            disabled={false}
            onClick={() => onSkip()}
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

const BackButton = styled.div`
  margin-bottom: 24px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
