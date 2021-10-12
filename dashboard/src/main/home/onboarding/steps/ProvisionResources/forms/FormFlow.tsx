import { ProvisionerConfig } from "main/home/onboarding/state/StateHandler";
import { SkipProvisionConfig } from "main/home/onboarding/types";
import React, { useContext, useMemo } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import { State } from "../ProvisionResourcesState";
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
    // status: AWSProvisionerStatus,
  },
  gcp: {
    credentials: GCPCredentialsForm,
    settings: GCPSettingsForm,
    // status: GCPProvisionerStatus,
  },
  do: {
    credentials: DOCredentialsForm,
    settings: DOSettingsForm,
    // status: DOProvisionerStatus,
  },
};

const FormTitle = {
  aws: "Amazon Web Services (AWS)",
  gcp: "Google Cloud Platform  (GCP)",
  do: "Digital Ocean",
};

type Props = {
  nextStep: () => void;
};

const FormFlowWrapper: React.FC<Props> = ({ nextStep }) => {
  const snap = useSnapshot(State);
  const { currentProject } = useContext(Context);

  const nextFormStep = (
    data?: Partial<Exclude<ProvisionerConfig, SkipProvisionConfig>>
  ) => {
    if (snap.currentStep === "credentials") {
      State.config.credentials = data.credentials;
      State.currentStep = "settings";
    } else if (snap.currentStep === "settings") {
      State.config.settings = data.settings;
      nextStep();
    }
  };

  const CurrentForm = useMemo(() => {
    if (snap.selectedProvider !== "external") {
      const providerSteps = Forms[snap.selectedProvider];
      if (!providerSteps) {
        return null;
      }

      const currentForm = providerSteps[snap.currentStep];
      if (!currentForm) {
        return null;
      }

      return React.createElement(currentForm as any, {
        nextFormStep,
        project: currentProject,
      });
    }
  }, [snap.currentStep, snap.selectedProvider]);

  return (
    <>
      {snap.selectedProvider !== "external" && FormTitle[snap.selectedProvider]}
      <Breadcrumb>
        <Text bold={snap.currentStep === "credentials"}>Credentials</Text>
        {" > "}
        <Text bold={snap.currentStep === "settings"}>Settings</Text>
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
