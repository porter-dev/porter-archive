import { ConnectedRegistryConfig } from "main/home/onboarding/state/StateHandler";
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
  SettingsForm as GCPSettingsForm,
  TestRegistryConnection as GCPTestRegistryConnection,
} from "./_GCPRegistryForm";

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
  },
  gcp: {
    label: "Google Container Registry (GCR)",
    icon: integrationList["gcr"].icon,
  },
  do: {
    label: "DigitalOcean Container Registry (DOCR)",
    icon: integrationList["do"].icon,
  },
};

type Props = {
  provider: SupportedProviders;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  project: { id: number; name: string };
  currentStep: "credentials" | "settings" | "test_connection";
  goBack: () => void;
  enable_go_back: boolean;
};

const FormFlowWrapper: React.FC<Props> = ({
  onSaveCredentials,
  onSaveSettings,
  onSuccess,
  provider,
  project,
  currentStep,
  goBack,
  enable_go_back,
}) => {
  const nextFormStep = (
    data?: Partial<Exclude<ConnectedRegistryConfig, SkipRegistryConnection>>
  ) => {
    if (currentStep === "credentials") {
      onSaveCredentials(data.credentials);
    } else if (currentStep === "settings") {
      onSaveSettings(data.settings);
    } else if (currentStep === "test_connection") {
      onSuccess();
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
      <FormHeader>
        {currentStep !== "test_connection" && (
          <CloseButton onClick={() => goBack()}>
            <i className="material-icons">keyboard_backspace</i>
          </CloseButton>
        )}
        {FormTitle[provider] && <img src={FormTitle[provider].icon} />}
        {FormTitle[provider] && FormTitle[provider].label}
      </FormHeader>
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
