import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { CloudProviderAzure } from "lib/clusters/constants";
import { MachineType, type ClientClusterContract } from "lib/clusters/types";
import { useClusterAnalytics } from "lib/hooks/useClusterAnalytics";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ConfigureAKSCluster from "./ConfigureAKSCluster";
import GrantAzurePermissions from "./GrantAzurePermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
};
const CreateAKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
}) => {
  const { availableMachineTypes } = useClusterFormContext();

  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const { setValue, reset } = useFormContext<ClientClusterContract>();
  const { setCurrentContract } = useClusterFormContext();
  const { reportToAnalytics } = useClusterAnalytics();

  const { watch } = useFormContext<ClientClusterContract>();

  const cloudProviderCredentialIdentifier = watch(
    "cluster.cloudProviderCredentialsId"
  );

  useEffect(() => {
    const truncatedProjectName = projectName
      .substring(0, 24)
      .replace(/-+$/, "");

    const clusterName = `${truncatedProjectName}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    reset({
      cluster: {
        projectId,
        cloudProvider: "Azure" as const,
        config: {
          kind: "AKS" as const,
          clusterName,
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
              instanceType: "Standard_B2as_v2",
              minInstances: 1,
              maxInstances: 3,
            },
          ],
          cidrRange: "10.78.0.0/16",
          serviceCidrRange: "172.20.0.0/16", // does not actually go into contract because not supported there yet
          skuTier: "FREE" as const,
        },
      },
    });
    setCurrentContract(CloudProviderAzure.newClusterDefaultContract);
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
          void reportToAnalytics({
            projectId,
            step: "cloud-provider-permissions-granted",
            provider: CloudProviderAzure.name,
            cloudProviderCredentialIdentifier,
          });
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
        availableMachineTypes={async (region: string) => {
          return await availableMachineTypes(
            "azure",
            cloudProviderCredentialIdentifier,
            region
          );
        }}
      />
    ))
    .exhaustive();
};

export default CreateAKSClusterForm;
