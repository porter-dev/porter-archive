import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import ConfigureEKSCluster from "./ConfigureEKSCluster";
import GrantAWSPermissions from "./GrantAWSPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  ackEnabled: boolean;
  createClusterButtonStatus: "loading" | JSX.Element | "success" | "";
  isCreateClusterButtonDisabled: boolean;
};
const CreateEKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  ackEnabled,
  createClusterButtonStatus,
  isCreateClusterButtonDisabled,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");
  const { setValue } = useFormContext<ClientClusterContract>();

  return match(step)
    .with("permissions", () => (
      <GrantAWSPermissions
        goBack={goBack}
        proceed={({
          cloudProviderCredentialIdentifier,
        }: {
          cloudProviderCredentialIdentifier: string;
        }) => {
          setValue(
            "cluster.cloudProviderCredentialsId",
            cloudProviderCredentialIdentifier
          );
          setStep("cluster");
        }}
        projectId={projectId}
        ackEnabled={ackEnabled}
      />
    ))
    .with("cluster", () => (
      <ConfigureEKSCluster
        goBack={() => {
          setStep("permissions");
          setValue("cluster.cloudProviderCredentialsId", "");
        }}
        createClusterButtonStatus={createClusterButtonStatus}
        isCreateClusterButtonDisabled={isCreateClusterButtonDisabled}
      />
    ))
    .exhaustive();
};

export default CreateEKSClusterForm;
