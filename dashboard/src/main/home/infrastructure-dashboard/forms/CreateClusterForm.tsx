import React, { useContext, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Contract } from "@porter-dev/api-contracts";
import axios from "axios";
import { FormProvider, useForm } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import Loading from "components/Loading";
import { Error as ErrorComponent } from "components/porter/Error";
import { updateExistingClusterContract } from "lib/clusters";
import {
  CloudProviderAWS,
  CloudProviderAzure,
  CloudProviderGCP,
} from "lib/clusters/constants";
import {
  clusterContractValidator,
  type ClientCloudProvider,
  type ClientClusterContract,
} from "lib/clusters/types";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";
import { Context } from "shared/Context";

import CreateEKSClusterForm from "./aws/CreateEKSClusterForm";
import CreateAKSClusterForm from "./azure/CreateAKSClusterForm";
import CloudProviderSelect from "./CloudProviderSelect";
import CreateGKEClusterForm from "./gcp/CreateGKEClusterForm";

const CreateClusterForm: React.FC = () => {
  const { currentProject } = useContext(Context);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
  });

  const {
    formState: { errors, isSubmitting },
    setError,
  } = clusterForm;

  const { showIntercomWithMessage } = useIntercom();

  const createClusterButtonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0 && errorKeys.includes("root")) {
      const errorMessage =
        errors.cluster?.message ??
        "Cluster creation failed. Please try again. If the error persists, please contact support@porter.run.";
      return <ErrorComponent message={errorMessage} maxWidth="600px" />;
    }

    return "";
  }, [isSubmitting, errors]);

  const onSubmit = clusterForm.handleSubmit(async (data) => {
    try {
      if (!currentProject) {
        return;
      }
      const defaultContract = match(selectedCloudProvider)
        .with({ name: "AWS" }, () => CloudProviderAWS.newClusterDefaultContract)
        .with({ name: "GCP" }, () => CloudProviderGCP.newClusterDefaultContract)
        .with(
          { name: "Azure" },
          () => CloudProviderAzure.newClusterDefaultContract
        )
        .otherwise(() => undefined);
      if (!defaultContract?.cluster) {
        return;
      }
      const contract = new Contract({
        cluster: updateExistingClusterContract(data, defaultContract.cluster),
      });
      await api.createContract("<token>", contract, {
        project_id: currentProject.id,
      });
    } catch (err) {
      showIntercomWithMessage({
        message: "I am running into an issue creating a cluster.",
      });

      let message =
        "Cluster creation failed: please try again or contact support@porter.run if the error persists.";

      if (axios.isAxiosError(err)) {
        const parsed = z
          .object({ error: z.string() })
          .safeParse(err.response?.data);
        if (parsed.success) {
          message = `Cluster creation failed: ${parsed.data.error}`;
        }
      }
      setError("root", {
        message,
      });
    }
  });

  if (!currentProject || currentProject.id === -1) {
    return <Loading />;
  }

  return (
    <CreateClusterFormContainer>
      <FormProvider {...clusterForm}>
        <form onSubmit={onSubmit}>
          {match(selectedCloudProvider)
            .with({ name: "AWS" }, () => (
              <CreateEKSClusterForm
                goBack={() => {
                  setSelectedCloudProvider(undefined);
                }}
                projectId={currentProject.id}
                projectName={currentProject.name}
                ackEnabled={currentProject.aws_ack_auth_enabled}
                createClusterButtonStatus={createClusterButtonStatus}
                isCreateClusterButtonDisabled={isSubmitting}
              />
            ))
            .with({ name: "GCP" }, () => (
              <CreateGKEClusterForm
                goBack={() => {
                  setSelectedCloudProvider(undefined);
                }}
                projectId={currentProject.id}
                projectName={currentProject.name}
                createClusterButtonStatus={createClusterButtonStatus}
                isCreateClusterButtonDisabled={isSubmitting}
              />
            ))
            .with({ name: "Azure" }, () => (
              <CreateAKSClusterForm
                goBack={() => {
                  setSelectedCloudProvider(undefined);
                }}
                projectId={currentProject.id}
                projectName={currentProject.name}
                createClusterButtonStatus={createClusterButtonStatus}
                isCreateClusterButtonDisabled={isSubmitting}
              />
            ))
            .otherwise(() => (
              <CloudProviderSelect
                onComplete={(provider: ClientCloudProvider) => {
                  setSelectedCloudProvider(provider);
                  if (currentProject?.id) {
                    void api.inviteAdmin(
                      "<token>",
                      {},
                      { project_id: currentProject.id }
                    );
                  }
                }}
              />
            ))}
        </form>
      </FormProvider>
    </CreateClusterFormContainer>
  );
};

export default CreateClusterForm;

const CreateClusterFormContainer = styled.div`
  width: 100%;
  height: 100%;
`;

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
