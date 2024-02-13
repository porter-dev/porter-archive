import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { match } from "ts-pattern";

import {
  clusterContractValidator,
  type ClientClusterContract,
} from "lib/clusters/types";

import ConfigureAKSCluster from "./ConfigureAKSCluster";
import GrantAzurePermissions from "./GrantAzurePermissions";

type Props = {
  goBack: () => void;
  projectId: number;
};
const CreateAKSClusterForm: React.FC<Props> = ({ goBack, projectId }) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
    defaultValues: {
      cluster: {
        cloudProvider: "Azure",
        config: {
          kind: "AKS",
          region: "us-east-1",
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
            />
          ))
          .exhaustive()}
      </form>
    </FormProvider>
  );
};

export default CreateAKSClusterForm;
