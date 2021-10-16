import { ConnectedRegistryConfig } from "main/home/onboarding/state/StateHandler";
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
  aws: "Amazon Elastic Container Registry (ECR)",
  gcp: "Google Container Registry (GCR)",
  do: "Digital Ocean Container Registry",
};

type Props = {
  provider: SupportedProviders;
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  onSuccess: () => void;
  project: { id: number; name: string };
  currentStep: "credentials" | "settings" | "test_connection";
};

const FormFlowWrapper: React.FC<Props> = ({
  onSaveCredentials,
  onSaveSettings,
  onSuccess,
  provider,
  project,
  currentStep,
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
      <Breadcrumb>
        <Text bold={currentStep === "credentials"}>Credentials</Text>
        {" > "}
        <Text bold={currentStep === "settings"}>Settings</Text>
        {" > "}
        <Text bold={currentStep === "test_connection"}>Test Connection</Text>
      </Breadcrumb>
      {CurrentForm}
    </FormWrapper>
  );
};

export default FormFlowWrapper;

const FormWrapper = styled.div`
  background: #ffffff11;
  margin-top: -10px;
  padding: 20px;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
`;

const Text = styled.span<{ bold: boolean }>`
  font-weight: ${(props) => (props.bold ? "600" : "normal")};
`;

const Breadcrumb = styled.div`
  font-size: 13px;
`;
