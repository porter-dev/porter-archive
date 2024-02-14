import React, { useContext, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import { Error as ErrorComponent } from "components/porter/Error";
import {
  CloudProviderAWS,
  CloudProviderAzure,
  CloudProviderGCP,
} from "lib/clusters/constants";
import {
  clusterContractValidator,
  type ClientCloudProvider,
  type ClientClusterContract,
  type UpdateClusterResponse,
} from "lib/clusters/types";
import { useUpdateCluster } from "lib/hooks/useCluster";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";
import { Context } from "shared/Context";

import PreflightChecksModal from "../modals/PreflightChecksModal";
import CreateEKSClusterForm from "./aws/CreateEKSClusterForm";
import CreateAKSClusterForm from "./azure/CreateAKSClusterForm";
import CloudProviderSelect from "./CloudProviderSelect";
import CreateGKEClusterForm from "./gcp/CreateGKEClusterForm";

// todo(ianedwards): refactor button to use more predictable state
export type UpdateClusterButtonProps = {
  status: "" | "loading" | JSX.Element | "success";
  isDisabled: boolean;
  loadingText: string;
};
const CreateClusterForm: React.FC = () => {
  const { currentProject } = useContext(Context);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<
    ClientCloudProvider | undefined
  >(undefined);
  const [showFailedPreflightChecksModal, setShowFailedPreflightChecksModal] =
    useState<boolean>(false);
  const [updateClusterResponse, setUpdateClusterResponse] = useState<
    | {
        response: UpdateClusterResponse;
        error?: string;
      }
    | {
        response?: UpdateClusterResponse;
        error: string;
      }
    | undefined
  >(undefined);

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
  });

  const { updateCluster, isHandlingPreflightChecks, isCreatingContract } =
    useUpdateCluster({ projectId: currentProject?.id });

  const {
    formState: { isSubmitting },
  } = clusterForm;

  const { showIntercomWithMessage } = useIntercom();

  const createClusterButtonProps = useMemo(() => {
    const props: UpdateClusterButtonProps = {
      status: "",
      isDisabled: false,
      loadingText: "",
    };
    if (isSubmitting) {
      props.status = "loading";
      props.isDisabled = true;
    }
    if (updateClusterResponse?.error) {
      props.status = (
        <ErrorComponent
          message={updateClusterResponse?.error}
          maxWidth="600px"
        />
      );
    }
    if (isHandlingPreflightChecks) {
      props.loadingText = "Running preflight checks...";
    }
    if (isCreatingContract) {
      props.loadingText = "Creating cluster...";
    }

    return props;
  }, [
    isSubmitting,
    updateClusterResponse,
    isHandlingPreflightChecks,
    isCreatingContract,
  ]);

  const onSubmit = clusterForm.handleSubmit(async (data) => {
    if (!currentProject) {
      return;
    }
    setUpdateClusterResponse(undefined);
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

    const response = await updateCluster(data, defaultContract);
    setUpdateClusterResponse(response);
    if (response.response?.preflightChecks) {
      setShowFailedPreflightChecksModal(true);
    }
    if (response.error) {
      showIntercomWithMessage({
        message: "I am running into an issue creating my cluster.",
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
                createButtonProps={createClusterButtonProps}
              />
            ))
            .with({ name: "GCP" }, () => (
              <CreateGKEClusterForm
                goBack={() => {
                  setSelectedCloudProvider(undefined);
                }}
                projectId={currentProject.id}
                projectName={currentProject.name}
                createButtonProps={createClusterButtonProps}
              />
            ))
            .with({ name: "Azure" }, () => (
              <CreateAKSClusterForm
                goBack={() => {
                  setSelectedCloudProvider(undefined);
                }}
                projectId={currentProject.id}
                projectName={currentProject.name}
                createButtonProps={createClusterButtonProps}
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
      {showFailedPreflightChecksModal &&
        updateClusterResponse?.response?.preflightChecks && (
          <PreflightChecksModal
            onClose={() => {
              setShowFailedPreflightChecksModal(false);
            }}
            preflightChecks={updateClusterResponse.response.preflightChecks}
          />
        )}
    </CreateClusterFormContainer>
  );
};

export default CreateClusterForm;

const CreateClusterFormContainer = styled.div`
  width: 100%;
  height: fit-content;
  margin-bottom: 10px;
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
