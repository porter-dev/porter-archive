import {
  ConnectedRegistryConfig,
  StateHandler,
} from "main/home/onboarding/state/StateHandler";
import Breadcrumb from "components/Breadcrumb";
import {
  SkipRegistryConnection,
  SupportedProviders,
} from "main/home/onboarding/types";
import React, { useMemo } from "react";
import styled from "styled-components";
import {
  CredentialsForm as AWSCredentialsForm,
  SettingsForm as AWSSettingsForm,
  TestRegistryConnection as AWSTestRegistryConnection,
} from "./_AWSRegistryForm";
import { integrationList } from "shared/common";
import {
  CredentialsForm as DOCredentialsForm,
  SettingsForm as DOSettingsForm,
  TestRegistryConnection as DOTestRegistryConnection,
} from "./_DORegistryForm";

import {
  CredentialsForm as GCPCredentialsForm,
  GARegistryConfig,
  SettingsForm as GCPSettingsForm,
  TestRegistryConnection as GCPTestRegistryConnection,
} from "./_GCPRegistryForm";
import { OFState } from "main/home/onboarding/state";
import { useSnapshot } from "valtio";
import { connectRegistryTracks, trackRedirectToGuide } from "shared/anayltics";
import { StepHandler } from "main/home/onboarding/state/StepHandler";

const Forms = {
  aws: {
    credentials: AWSCredentialsForm,
    settings: AWSSettingsForm,
    test_connection: AWSTestRegistryConnection,
  },
  gcp: {
    credentials: GCPCredentialsForm,
    settings: GCPSettingsForm,
    test_connection: GCPTestRegistryConnection,
  },
  gar: {
    credentials: GCPCredentialsForm,
    settings: GARegistryConfig,
    test_connection: GCPTestRegistryConnection,
  },
  do: {
    credentials: DOCredentialsForm,
    settings: DOSettingsForm,
    test_connection: DOTestRegistryConnection,
  },
};

const FormTitle = {
  aws: {
    label: "Amazon Elastic Container Registry (ECR)",
    icon: integrationList["ecr"].icon,
    doc:
      "https://docs.porter.run/deploying-applications/deploying-from-docker-registry/linking-existing-registry#amazon-elastic-container-registry-ecr",
  },
  gcp: {
    label: "Google Container Registry (GCR)",
    icon: integrationList["gcr"].icon,
    doc:
      "https://docs.porter.run/deploying-applications/deploying-from-docker-registry/linking-existing-registry#google-container-registry-gcr",
  },
  gar: {
    label: "Google Artifact Registry (GAR)",
    icon: integrationList["gcr"].icon,
    doc:
      "https://docs.porter.run/deploying-applications/deploying-from-docker-registry/linking-existing-registry#google-artifact-registry-gar",
  },
  do: {
    label: "DigitalOcean Container Registry (DOCR)",
    icon: integrationList["do"].icon,
    doc:
      "https://docs.porter.run/deploying-applications/deploying-from-docker-registry/linking-existing-registry#digital-ocean-container-registry",
  },
};

type Props = {
  currentStep: "credentials" | "settings" | "test_connection";
};

const FormFlowWrapper: React.FC<Props> = ({ currentStep }) => {
  const snap = useSnapshot(StateHandler);
  const stepHandler = useSnapshot(StepHandler);

  const provider = snap.connected_registry.provider as SupportedProviders;
  const project = snap.project;

  const handleContinue = (data?: any) => {
    OFState.actions.nextStep("continue", data);
  };

  const handleGoBack = () => {
    OFState.actions.nextStep("go_back");
  };

  const nextFormStep = (
    data?: Partial<Exclude<ConnectedRegistryConfig, SkipRegistryConnection>>
  ) => {
    if (currentStep === "credentials") {
      connectRegistryTracks.trackRegistryAddCredentials({
        provider: provider,
        step: stepHandler.currentStepName,
      });
      handleContinue(data.credentials);
    } else if (currentStep === "settings") {
      connectRegistryTracks.trackConnectRegistryClicked({
        provider: provider,
      });
      handleContinue(data.settings);
    } else if (currentStep === "test_connection") {
      handleContinue();
    }
  };

  const CurrentForm = useMemo(() => {
    const providerSteps = Forms[provider];
    if (!providerSteps) {
      return null;
    }

    const currentForm = providerSteps[currentStep];
    if (!currentForm) {
      return null;
    }

    return React.createElement(currentForm as any, {
      nextFormStep,
      project,
    });
  }, [provider, currentStep]);

  return (
    <FormWrapper>
      <Header>
        <FormHeader>
          {currentStep !== "test_connection" && (
            <CloseButton onClick={() => handleGoBack()}>
              <i className="material-icons">keyboard_backspace</i>
            </CloseButton>
          )}
          {FormTitle[provider] && <img src={FormTitle[provider].icon} />}
          {FormTitle[provider] && FormTitle[provider].label}
        </FormHeader>
        <GuideButton
          href={FormTitle[provider].doc}
          target="_blank"
          onAuxClick={() => {
            trackRedirectToGuide({
              step: stepHandler.currentStepName,
              guide_url: FormTitle[provider].doc,
              provider,
            });
            // Will allow the anchor tag to redirect properly
            return true;
          }}
          onClick={() => {
            trackRedirectToGuide({
              step: stepHandler.currentStepName,
              guide_url: FormTitle[provider].doc,
              provider,
            });
            // Will allow the anchor tag to redirect properly
            return true;
          }}
        >
          <i className="material-icons-outlined">help</i>
          Guide
        </GuideButton>
      </Header>
      <Breadcrumb
        currentStep={currentStep}
        steps={[
          { value: "credentials", label: "Credentials" },
          { value: "settings", label: "Settings" },
          { value: "test_connection", label: "Test Connection" },
        ]}
      />
      {CurrentForm}
    </FormWrapper>
  );
};

export default FormFlowWrapper;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-top: -17px;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 8px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 7px;
  }
`;

const CloseButton = styled.div`
  width: 30px;
  height: 30px;
  margin-left: -5px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 10px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const FormHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-size: 13px;
  margin-top: -2px;
  font-weight: 500;
  width: 100%;

  > img {
    height: 22px;
    margin-right: 12px;
  }
`;

const FormWrapper = styled.div`
  background: #ffffff0a;
  margin-top: 25px;
  padding: 20px 20px 23px;
  border-radius: 5px;
  position: relative;
  border: 1px solid #ffffff55;
`;
