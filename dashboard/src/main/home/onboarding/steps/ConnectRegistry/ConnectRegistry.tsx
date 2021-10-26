import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React from "react";
import { useParams } from "react-router";

import styled from "styled-components";
import ProviderSelector, {
  registryOptions,
} from "../../components/ProviderSelector";
import backArrow from "assets/back_arrow.png";

import FormFlowWrapper from "./forms/FormFlow";
import { OFState } from "../../state";
import { useSnapshot } from "valtio";

const ConnectRegistry: React.FC<{}> = ({}) => {
  const snap = useSnapshot(OFState);
  const { step } = useParams<any>();

  const currentProvider = snap.StateHandler.connected_registry?.provider;

  const enableGoBack =
    snap.StepHandler.canGoBack && !snap.StepHandler.isSubFlow;

  const handleGoBack = () => {
    OFState.actions.nextStep("go_back");
  };

  const handleSkip = () => {
    OFState.actions.nextStep("skip");
  };

  const handleSelectProvider = (provider: string) => {
    provider !== "skip" && OFState.actions.nextStep("continue", provider);
  };

  return (
    <Div>
      {enableGoBack && (
        <BackButton
          onClick={() => {
            handleGoBack();
          }}
        >
          <BackButtonImg src={backArrow} />
        </BackButton>
      )}
      <TitleSection>Getting Started</TitleSection>
      <Subtitle>
        Step 2 of 3 - Connect an existing registry (Optional)
        <a
          href="https://docs.porter.run/docs/linking-up-application-source#connecting-an-existing-image-registry"
          target="_blank"
        >
          <i className="material-icons">help_outline</i>
        </a>
      </Subtitle>
      <Helper>
        {currentProvider
          ? "Link to an existing Docker registry. Don't worry if you don't know what this is."
          : "Link to an existing Docker registry or continue."}
      </Helper>

      {step ? (
        <FormFlowWrapper currentStep={step} />
      ) : (
        <>
          <ProviderSelector
            selectProvider={(provider) => {
              if (provider !== "external") {
                handleSelectProvider(provider);
              }
            }}
            options={registryOptions}
          />
          <NextStep
            text="Continue"
            disabled={false}
            onClick={() => handleSkip()}
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

const Subtitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-top: 16px;

  display: flex;
  align-items: center;
  > a {
    > i {
      font-size: 18px;
      margin-left: 10px;
      margin-top: 1px;
      color: #8590ff;
      :hover {
        color: #aaaabb;
      }
    }
  }
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
