import { ProvisionerConfig } from "main/home/onboarding/state/StateHandler";
import {
  SkipProvisionConfig,
  SupportedProviders,
} from "main/home/onboarding/types";
import React, { useContext, useMemo } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import {
  CredentialsForm as AWSCredentialsForm,
  SettingsForm as AWSSettingsForm,
  Status as AWSProvisionerStatus,
} from "./_AWSProvsionerForm";

import {
  CredentialsForm as DOCredentialsForm,
  SettingsForm as DOSettingsForm,
  Status as DOProvisionerStatus,
} from "./_DOProvisionerForm";

import {
  CredentialsForm as GCPCredentialsForm,
  SettingsForm as GCPSettingsForm,
  Status as GCPProvisionerStatus,
} from "./_GCPProvisionerForm";

const Forms = {
  aws: {
    credentials: AWSCredentialsForm,
    settings: AWSSettingsForm,
    status: AWSProvisionerStatus,
  },
  gcp: {
    credentials: GCPCredentialsForm,
    settings: GCPSettingsForm,
    status: GCPProvisionerStatus,
  },
  do: {
    credentials: DOCredentialsForm,
    settings: DOSettingsForm,
    status: DOProvisionerStatus,
  },
};

const FormTitle = {
  aws: "Amazon Web Services (AWS)",
  gcp: "Google Cloud Platform  (GCP)",
  do: "Digital Ocean",
};

type Props = {
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  provider: SupportedProviders | "external";
  currentStep: "credentials" | "settings" | "status";
  project: { id: number; name: string };
};

const FormFlowWrapper: React.FC<Props> = ({
  onSaveCredentials,
  onSaveSettings,
  provider,
  currentStep,
  project,
}) => {
  const nextFormStep = (
    data?: Partial<Exclude<ProvisionerConfig, SkipProvisionConfig>>
  ) => {
    if (currentStep === "credentials") {
      onSaveCredentials(data);
    } else if (currentStep === "settings") {
      onSaveSettings(data);
    }
  };

  const CurrentForm = useMemo(() => {
    if (provider !== "external") {
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
        project: project,
      });
    }
  }, [currentStep, provider]);

  return (
    <>
      {provider !== "external" && FormTitle[provider]}
      <Breadcrumb>
        <Text bold={currentStep === "credentials"}>Credentials</Text>
        {" > "}
        <Text bold={currentStep === "settings"}>Settings</Text>
      </Breadcrumb>
      {CurrentForm}
    </>
  );
};

export default FormFlowWrapper;

const Text = styled.span<{ bold: boolean }>`
  font-weight: ${(props) => (props.bold ? "600" : "normal")};
`;

const Breadcrumb = styled.div`
  margin: 0 10px;
`;
