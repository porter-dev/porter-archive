import Helper from "components/form-components/Helper";
import SaveButton from "components/SaveButton";
import TitleSection from "components/TitleSection";
import React, { useState } from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import ProviderSelector, {
  provisionerOptions,
  provisionerOptionsWithExternal,
} from "../../components/ProviderSelector";

import FormFlowWrapper from "./forms/FormFlow";
import ConnectExternalCluster from "./forms/_ConnectExternalCluster";
import backArrow from "assets/back_arrow.png";
import { SharedStatus } from "./forms/SharedStatus";
import { useSnapshot } from "valtio";
import { OFState } from "../../state";

type Props = {};

const ProvisionResources: React.FC<Props> = () => {
  const snap = useSnapshot(OFState);
  const { step } = useParams<{ step: any }>();
  const [infraStatus, setInfraStatus] = useState<{
    hasError: boolean;
    description?: string;
  }>(null);

  const shouldProvisionRegistry = !!snap.StateHandler.connected_registry?.skip;
  const provider = snap.StateHandler.provision_resources?.provider;
  const project = snap.StateHandler.project;
  const enableGoBack =
    snap.StepHandler.canGoBack && !snap.StepHandler.isSubFlow;

  const handleContinue = (data?: any) => {
    OFState.actions.nextStep("continue", data);
  };

  const handleGoBack = (data?: any) => {
    OFState.actions.nextStep("go_back", data);
  };

  const handleSelectProvider = (provider: string) => {
    if (provider !== "external") {
      OFState.actions.nextStep("continue", provider);
      return;
    }
    OFState.actions.nextStep("skip");
  };

  const renderSaveButton = () => {
    if (typeof infraStatus?.hasError !== "boolean") {
      return;
    }

    if (infraStatus && !infraStatus.hasError) {
      return (
        <>
          <Br height="15px" />
          <SaveButton
            text="Continue"
            disabled={false}
            onClick={() => handleContinue()}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
          />
        </>
      );
    } else if (infraStatus) {
      return (
        <>
          <Br height="15px" />
          <SaveButton
            text="Resolve Errors"
            status="Encountered errors while provisioning."
            disabled={false}
            onClick={() => handleGoBack(infraStatus.description)}
            makeFlush={true}
            clearPosition={true}
            statusPosition="right"
            saveText=""
          />
        </>
      );
    }
  };

  const getFilterOpts = (): string[] => {
    switch (provider) {
      case "aws":
        return ["eks", "ecr"];
      case "gcp":
        return ["gke", "gcr"];
      case "do":
        return ["doks", "docr"];
    }

    return [];
  };

  const Content = () => {
    switch (step) {
      case "credentials":
      case "settings":
        return <FormFlowWrapper currentStep={step} />;
      case "status":
        return (
          <>
            <SharedStatus
              project_id={project?.id}
              filter={getFilterOpts()}
              setInfraStatus={setInfraStatus}
            />
            <Br />
            <Helper>Note: Provisioning can take up to 15 minutes.</Helper>
            {renderSaveButton()}
          </>
        );
      case "connect_own_cluster":
        return (
          <ConnectExternalCluster
            nextStep={handleContinue}
            project={project}
            goBack={handleGoBack}
          />
        );
      default:
        return (
          <ProviderSelector
            selectProvider={handleSelectProvider}
            options={
              shouldProvisionRegistry
                ? provisionerOptions
                : provisionerOptionsWithExternal
            }
          />
        );
    }
  };

  return (
    <div>
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
      <Subtitle>Step 3 of 3 - Provision resources</Subtitle>
      <Helper>
        Porter automatically creates a cluster and registry in your cloud to run
        applications.
      </Helper>
      {Content()}
    </div>
  );
};

export default ProvisionResources;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${(props) => props.height || "1px"};
  margin-top: -3px;
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
