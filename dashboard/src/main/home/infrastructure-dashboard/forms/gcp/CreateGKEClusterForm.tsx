import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import ConfigureGKECluster from "./ConfigureGKECluster";
import GrantGCPPermissions from "./GrantGCPPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
  createClusterButtonStatus: "loading" | JSX.Element | "success" | "";
  isCreateClusterButtonDisabled: boolean;
};

const CreateGKEClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
  isCreateClusterButtonDisabled,
  createClusterButtonStatus,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const { setValue, reset } = useFormContext<ClientClusterContract>();

  useEffect(() => {
    const clusterName = `${projectName}-cluster-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    reset({
      cluster: {
        projectId,
        cloudProvider: "GCP" as const,
        config: {
          kind: "GKE" as const,
          clusterName,
          region: "us-east1",
          nodeGroups: [
            {
              nodeGroupType: "APPLICATION" as const,
              instanceType: "e2-standard-2",
              minInstances: 1,
              maxInstances: 10,
            },
            {
              nodeGroupType: "SYSTEM" as const,
              instanceType: "custom-2-4096",
              minInstances: 1,
              maxInstances: 2,
            },
            {
              nodeGroupType: "MONITORING" as const,
              instanceType: "custom-2-4096",
              minInstances: 1,
              maxInstances: 1,
            },
          ],
          cidrRange: "10.78.0.0/16",
        },
      },
    });
  }, []);

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
