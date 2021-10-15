import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useState } from "react";
import { useParams } from "react-router";

import styled from "styled-components";
import ProviderSelector from "../../components/ProviderSelector";
import { ConnectedRegistryConfig } from "../../state/StateHandler";
import { SupportedProviders } from "../../types";

import FormFlowWrapper from "./forms/FormFlow";

const ConnectRegistry: React.FC<{
  provider: SupportedProviders;
  project: {
    id: number;
    name: string;
  };
  onSelectProvider: (provider: SupportedProviders) => void;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  onSkip: () => void;
}> = ({
  onSelectProvider,
  onSaveCredentials,
  onSaveSettings,
  onSuccess,
  onSkip,
  project,
  provider,
}) => {
  const { step } = useParams<any>();

  return (
    <div>
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>Step 2 of 3</Subtitle>
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
    </div>
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
