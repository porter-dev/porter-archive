import { ProvisionerConfig } from "main/home/onboarding/state/StateHandler";
import {
  SkipProvisionConfig,
  SupportedProviders,
} from "main/home/onboarding/types";
import React, { useMemo } from "react";
import styled from "styled-components";
import Breadcrumb from "components/Breadcrumb";
import { integrationList } from "shared/common";
import {
  CredentialsForm as AWSCredentialsForm,
  SettingsForm as AWSSettingsForm,
} from "./_AWSProvisionerForm";

import {
  CredentialsForm as DOCredentialsForm,
  SettingsForm as DOSettingsForm,
} from "./_DOProvisionerForm";

import {
  CredentialsForm as GCPCredentialsForm,
  SettingsForm as GCPSettingsForm,
} from "./_GCPProvisionerForm";

const Forms = {
  aws: {
    credentials: AWSCredentialsForm,
    settings: AWSSettingsForm,
  },
  gcp: {
    credentials: GCPCredentialsForm,
    settings: GCPSettingsForm,
  },
  do: {
    credentials: DOCredentialsForm,
    settings: DOSettingsForm,
  },
};

const FormTitle = {
  aws: {
    label: "Amazon Web Services (AWS)",
    icon: integrationList["aws"].icon,
    doc: "https://docs.porter.run/docs/getting-started-on-aws"
  },
  gcp: {
    label: "Google Cloud Platform (GCP)",
    icon: integrationList["gcp"].icon,
    doc: "https://docs.porter.run/docs/provisioning-on-google-cloud"
  },
  do: {
    label: "DigitalOcean (DO)",
    icon: integrationList["do"].icon,
    doc: "https://docs.porter.run/docs/provisioning-on-digital-ocean"
  },
  external: {
    label: "Connect an existing cluster",
    icon: integrationList["kubernetes"],
    doc: ""
  },
};

type Props = {
  onSaveCredentials: (credentials: any) => void;
  onSaveSettings: (settings: any) => void;
  provider: SupportedProviders | "external";
  currentStep: "credentials" | "settings";
  project: { id: number; name: string };
  goBack: () => void;
};

const FormFlowWrapper: React.FC<Props> = ({
  onSaveCredentials,
  onSaveSettings,
  provider,
  currentStep,
  project,
  goBack,
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
    <FormWrapper>
      <Header>
        <FormHeader>
          <CloseButton onClick={() => goBack()}>
            <i className="material-icons">keyboard_backspace</i>
          </CloseButton>
          {FormTitle[provider] && <img src={FormTitle[provider].icon} />}
          {FormTitle[provider] && FormTitle[provider].label}
        </FormHeader>
          <GuideButton href={FormTitle[provider].doc} target="_blank">
              <i className="material-icons-outlined">help</i>
              Guide
          </GuideButton>
      </Header>
      <Breadcrumb
        currentStep={currentStep}
        steps={[
          { value: "credentials", label: "Credentials" },
          { value: "settings", label: "Settings" },
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
`

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

  > img {
    height: 18px;
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
