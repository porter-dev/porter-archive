import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React from "react";
import { useParams } from "react-router";

import styled from "styled-components";
import ProviderSelector, {
  registryOptions,
} from "../../components/ProviderSelector";
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
  onSelectProvider: (provider: SupportedProviders | "skip") => void;
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
    <Div>
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
      <Subtitle>Step 2 of 3 - Connect an existing registry (Optional)</Subtitle>
      <Helper>
        {provider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is."
          : "Link to an existing Docker registry or continue."}
      </Helper>

      {step ? (
        <FormFlowWrapper
          provider={provider}
          onSaveCredentials={onSaveCredentials}
          onSaveSettings={onSaveSettings}
          onSuccess={onSuccess}
          project={project}
          currentStep={step}
          goBack={goBack}
          enable_go_back={enable_go_back}
        />
      ) : (
        <>
          <ProviderSelector
            selectProvider={(provider) => {
              if (provider !== "external") {
                onSelectProvider(provider);
              }
            }}
            options={registryOptions}
          />
          <NextStep
            text="Continue"
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
    </Div>
  );
};

export default ConnectRegistry;

const Div = styled.div`
  width: 100%;
`;

const FadeWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: fadeIn 0.5s ${(props) => props.delay || "0.2s"};
  animation-fill-mode: forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const SlideWrapper = styled.div<{ delay?: string }>`
  opacity: 0;
  animation: slideIn 0.7s ${(props) => props.delay || "1.3s"};
  animation-fill-mode: forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const Subtitle = styled.div`
  font-size: 16px;
  font-weight: 500;
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
