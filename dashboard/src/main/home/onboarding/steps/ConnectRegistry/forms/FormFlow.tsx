import { ConnectedRegistryConfig } from "main/home/onboarding/state/StateHandler";
import { SkipRegistryConnection } from "main/home/onboarding/types";
import React, { useContext, useMemo } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";
import { useSnapshot } from "valtio";
import { State } from "../ConnectRegistryState";
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
  nextStep: () => void;
};

const FormFlowWrapper: React.FC<Props> = ({ nextStep }) => {
  const snap = useSnapshot(State);
  const { currentProject } = useContext(Context);

  const nextFormStep = (
    data: Partial<Exclude<ConnectedRegistryConfig, SkipRegistryConnection>>
  ) => {
    if (snap.currentStep === "credentials") {
      State.config.credentials = data.credentials;
      State.currentStep = "settings";
    } else if (snap.currentStep === "settings") {
      State.config.settings = data.settings;
      State.currentStep = "test_connection";
    } else if (snap.currentStep === "test_connection") {
      nextStep();
    }
  };

  const CurrentForm = useMemo(() => {
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
  }, [snap.currentStep, snap.selectedProvider]);

  return (
    <>
      {FormTitle[snap.selectedProvider]}
      <Breadcrumb>
        <Text bold={snap.currentStep === "credentials"}>Credentials</Text>
        {" > "}
        <Text bold={snap.currentStep === "settings"}>Settings</Text>
        {" > "}
        <Text bold={snap.currentStep === "test_connection"}>
          Test Connection
        </Text>
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
