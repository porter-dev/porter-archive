import React, { useContext, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import {
  clusterContractValidator,
  type ClientClusterContract,
} from "lib/clusters/types";

import { Context } from "shared/Context";

import ConfigureEKSCluster from "./ConfigureEKSCluster";
import GrantAWSPermissions from "./GrantAWSPermissions";

type Props = {
  goBack: () => void;
};
const CreateEKSClusterForm: React.FC<Props> = ({ goBack }) => {
  const [step, setStep] = useState<"permissions" | "cluster">("permissions");
  const { currentProject } = useContext(Context);
  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
    defaultValues: {
      cluster: {
        cloudProvider: "AWS",
        config: {
          kind: "EKS",
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
  if (!currentProject || currentProject.id === -1) {
    return <Loading />;
  }
  return (
    <FormProvider {...clusterForm}>
      <form>
        {match(step)
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
              projectId={currentProject.id}
              ackEnabled={currentProject.aws_ack_auth_enabled}
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
          .exhaustive()}
      </form>
    </FormProvider>
  );
};

export default CreateEKSClusterForm;

export const Img = styled.img`
  height: 18px;
  margin-right: 15px;
`;

export const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;
