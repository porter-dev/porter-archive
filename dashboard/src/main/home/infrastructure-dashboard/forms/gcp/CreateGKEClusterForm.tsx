import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { match } from "ts-pattern";

import {
  clusterContractValidator,
  type ClientClusterContract,
} from "lib/clusters/types";

import ConfigureGKECluster from "./ConfigureGKECluster";
import GrantGCPPermissions from "./GrantGCPPermissions";

type Props = {
  goBack: () => void;
  projectId: number;
};

const CreateGKEClusterForm: React.FC<Props> = ({ goBack, projectId }) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
    defaultValues: {
      cluster: {
        cloudProvider: "GCP",
        config: {
          kind: "GKE",
          region: "us-east1",
          nodeGroups: [
            {
              nodeGroupType: "APPLICATION",
              instanceType: "t3.medium",
              minInstances: 1,
              maxInstances: 10,
            },
          ],
        },
      },
    },
  });
  const { setValue } = clusterForm;

  return (
    <FormProvider {...clusterForm}>
      <form>
        {match(step)
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
            />
          ))
          .exhaustive()}
      </form>
    </FormProvider>
  );
};

export default CreateGKEClusterForm;
