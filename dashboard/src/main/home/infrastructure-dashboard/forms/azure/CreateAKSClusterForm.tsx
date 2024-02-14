import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import ConfigureAKSCluster from "./ConfigureAKSCluster";
import GrantAzurePermissions from "./GrantAzurePermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
  createClusterButtonStatus: "loading" | JSX.Element | "success" | "";
  isCreateClusterButtonDisabled: boolean;
};
const CreateAKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
  createClusterButtonStatus,
  isCreateClusterButtonDisabled,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const { setValue, reset } = useFormContext<ClientClusterContract>();

  useEffect(() => {
    reset({
      cluster: {
        projectId,
        cloudProvider: "Azure" as const,
        config: {
          kind: "AKS" as const,
          clusterName: `${projectName}-cluster-${Math.random()
            .toString(36)
            .substring(2, 8)}`,
          region: "eastus",
          nodeGroups: [
            {
              nodeGroupType: "APPLICATION" as const,
              instanceType: "Standard_B2als_v2",
              minInstances: 1,
              maxInstances: 10,
            },
            {
              nodeGroupType: "SYSTEM" as const,
              instanceType: "Standard_B2als_v2",
              minInstances: 1,
              maxInstances: 3,
            },
            {
              nodeGroupType: "MONITORING" as const,
              instanceType: "Standard_B2als_v2",
              minInstances: 1,
              maxInstances: 3,
            },
          ],
          cidrRange: "10.78.0.0/16",
          skuTier: "FREE" as const,
        },
      },
    });
  }, []);

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
