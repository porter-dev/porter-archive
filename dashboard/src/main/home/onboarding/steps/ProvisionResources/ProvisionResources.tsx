import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import ProviderSelector from "../../components/ProviderSelector";

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
  const { step } = useParams<{ step: any }>();

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
          <FormFlowWrapper
            provider={provider}
            currentStep={step}
            onSaveCredentials={onSaveCredentials}
            onSaveSettings={onSaveSettings}
            project={project}
          />
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
