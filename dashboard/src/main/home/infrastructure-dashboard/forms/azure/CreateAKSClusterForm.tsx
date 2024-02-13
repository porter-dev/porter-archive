import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import ConfigureAKSCluster from "./ConfigureAKSCluster";
import GrantAzurePermissions from "./GrantAzurePermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  createClusterButtonStatus: "loading" | JSX.Element | "success" | "";
  isCreateClusterButtonDisabled: boolean;
};
const CreateAKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  createClusterButtonStatus,
  isCreateClusterButtonDisabled,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const { setValue } = useFormContext<ClientClusterContract>();

  return match(step)
    .with("permissions", () => (
      <GrantAzurePermissions
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
      />
    ))
    .with("cluster", () => (
      <ConfigureAKSCluster
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

export default CreateAKSClusterForm;
