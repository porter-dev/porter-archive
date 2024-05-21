import React, { useEffect, useState } from "react";
import { CloudProviderAWS } from "legacy/lib/clusters/constants";
import { type ClientClusterContract } from "legacy/lib/clusters/types";
import { useClusterAnalytics } from "legacy/lib/hooks/useClusterAnalytics";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ConfigureEKSCluster from "./ConfigureEKSCluster";
import GrantAWSPermissions from "./GrantAWSPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
};
const CreateEKSClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");
  const { setValue, reset } = useFormContext<ClientClusterContract>();
  const { setCurrentContract } = useClusterFormContext();
  const { reportToAnalytics } = useClusterAnalytics();

  useEffect(() => {
    const projectNameLimit = 31 - "-cluster-".length - 6; // 6 characters for the random suffix
    const truncatedProjectName = projectName.substring(0, projectNameLimit);
    const clusterName = `${truncatedProjectName}-cluster-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    reset({
      cluster: {
        projectId,
        cloudProvider: "AWS" as const,
        config: {
          kind: "EKS" as const,
          clusterName,
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
          serviceCidrRange: "172.20.0.0/16",
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
          void reportToAnalytics({
            projectId,
            step: "cloud-provider-permissions-granted",
            provider: CloudProviderAWS.name,
            cloudProviderCredentialIdentifier,
          });
          setStep("cluster");
        }}
        projectId={projectId}
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
