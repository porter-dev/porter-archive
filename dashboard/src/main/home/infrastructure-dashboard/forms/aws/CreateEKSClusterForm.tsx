import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { CloudProviderAWS } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ConfigureEKSCluster from "./ConfigureEKSCluster";
import GrantAWSPermissions from "./GrantAWSPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
  ackEnabled: boolean;
};
const CreateEKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
  ackEnabled,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");
  const { setValue, reset } = useFormContext<ClientClusterContract>();
  const { setCurrentContract } = useClusterFormContext();

  useEffect(() => {
    reset({
      cluster: {
        projectId,
        cloudProvider: "AWS" as const,
        config: {
          kind: "EKS" as const,
          clusterName: `${projectName}-cluster-${Math.random()
            .toString(36)
            .substring(2, 8)}`,
          region: "us-east-1",
          nodeGroups: [
            {
              nodeGroupType: "APPLICATION" as const,
              instanceType: "t3.medium",
              minInstances: 1,
              maxInstances: 10,
            },
            {
              nodeGroupType: "SYSTEM" as const,
              instanceType: "t3.medium",
              minInstances: 1,
              maxInstances: 3,
            },
            {
              nodeGroupType: "MONITORING" as const,
              instanceType: "t3.large",
              minInstances: 1,
              maxInstances: 1,
            },
          ],
          cidrRange: "10.78.0.0/16",
        },
      },
    });
    setCurrentContract(CloudProviderAWS.newClusterDefaultContract);
  }, []);

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
      />
    ))
    .exhaustive();
};

export default CreateEKSClusterForm;
