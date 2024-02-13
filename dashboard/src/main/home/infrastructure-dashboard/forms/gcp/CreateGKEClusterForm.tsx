import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import ConfigureGKECluster from "./ConfigureGKECluster";
import GrantGCPPermissions from "./GrantGCPPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  createClusterButtonStatus: "loading" | JSX.Element | "success" | "";
  isCreateClusterButtonDisabled: boolean;
};

const CreateGKEClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  isCreateClusterButtonDisabled,
  createClusterButtonStatus,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("cluster");

  const { setValue } = useFormContext<ClientClusterContract>();

  return match(step)
    .with("permissions", () => (
      <GrantGCPPermissions
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
      <ConfigureGKECluster
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

export default CreateGKEClusterForm;
