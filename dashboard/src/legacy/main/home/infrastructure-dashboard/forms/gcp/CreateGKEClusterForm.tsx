import React, { useEffect, useState } from "react";
import { CloudProviderGCP } from "legacy/lib/clusters/constants";
import { type ClientClusterContract } from "legacy/lib/clusters/types";
import { useClusterAnalytics } from "legacy/lib/hooks/useClusterAnalytics";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ConfigureGKECluster from "./ConfigureGKECluster";
import GrantGCPPermissions from "./GrantGCPPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
  projectName: string;
};

const CreateGKEClusterForm: React.FC<Props> = ({
  goBack,
  projectId,
  projectName,
}) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const { setValue, reset } = useFormContext<ClientClusterContract>();
  const { setCurrentContract } = useClusterFormContext();
  const { reportToAnalytics } = useClusterAnalytics();

  useEffect(() => {
    const projectNameLimit = 20 - 7; // 7 characters for the random suffix, 20 for max length of entire cluster name
    const truncatedProjectName = projectName.substring(0, projectNameLimit);
    const clusterName = `${truncatedProjectName}-${Math.random()
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
          serviceCidrRange: "172.20.0.0/16",
        },
      },
    });
    setCurrentContract(CloudProviderGCP.newClusterDefaultContract);
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
          void reportToAnalytics({
            projectId,
            step: "cloud-provider-permissions-granted",
            provider: CloudProviderGCP.name,
            cloudProviderCredentialIdentifier,
          });
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
      />
    ))
    .exhaustive();
};

export default CreateGKEClusterForm;
