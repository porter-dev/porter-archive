import React, { createContext, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Contract } from "@porter-dev/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import { Error as ErrorComponent } from "components/porter/Error";
import {
  clusterContractValidator,
  type ClientClusterContract,
  type UpdateClusterResponse,
} from "lib/clusters/types";
import { useUpdateCluster } from "lib/hooks/useCluster";
import { useClusterAnalytics } from "lib/hooks/useClusterAnalytics";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";

import PreflightChecksModal from "./modals/PreflightChecksModal";

// todo(ianedwards): refactor button to use more predictable state
export type UpdateClusterButtonProps = {
  status: "" | "loading" | JSX.Element | "success";
  isDisabled: boolean;
  loadingText: string;
};

type ClusterFormContextType = {
  isAdvancedSettingsEnabled: boolean;
  isMultiClusterEnabled: boolean;
  showFailedPreflightChecksModal: boolean;
  updateClusterButtonProps: UpdateClusterButtonProps;
  setCurrentContract: (contract: Contract) => void;
};

const ClusterFormContext = createContext<ClusterFormContextType | null>(null);

export const useClusterFormContext = (): ClusterFormContextType => {
  const ctx = React.useContext(ClusterFormContext);
  if (!ctx) {
    throw new Error(
      "useClusterFormContext must be used within a ClusterFormContextProvider"
    );
  }
  return ctx;
};

type ClusterFormContextProviderProps = {
  projectId?: number;
  isAdvancedSettingsEnabled?: boolean;
  isMultiClusterEnabled?: boolean;
  redirectOnSubmit?: boolean;
  children: JSX.Element;
};

const ClusterFormContextProvider: React.FC<ClusterFormContextProviderProps> = ({
  projectId,
  isAdvancedSettingsEnabled = false,
  isMultiClusterEnabled = false,
  redirectOnSubmit,
  children,
}) => {
  const history = useHistory();
  const [currentContract, setCurrentContract] = useState<Contract | undefined>(
    undefined
  );
  const [updateClusterResponse, setUpdateClusterResponse] = useState<
    UpdateClusterResponse | undefined
  >(undefined);
  const [updateClusterError, setUpdateClusterError] = useState<string>("");
  const [showFailedPreflightChecksModal, setShowFailedPreflightChecksModal] =
    useState<boolean>(false);

  const scrollToTopRef = useRef<HTMLDivElement | null>(null);

  const { updateCluster, isHandlingPreflightChecks, isCreatingContract } =
    useUpdateCluster({ projectId });

  const { showIntercomWithMessage } = useIntercom();

  const { reportToAnalytics } = useClusterAnalytics();

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
  });
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
  } = clusterForm;

  const queryClient = useQueryClient();

  const updateClusterButtonProps = useMemo(() => {
    const props: UpdateClusterButtonProps = {
      status: "",
      isDisabled: false,
      loadingText: "",
    };
    if (isSubmitting) {
      props.status = "loading";
      props.isDisabled = true;
    }

    if (updateClusterError) {
      props.status = (
        <ErrorComponent message={updateClusterError} maxWidth="600px" />
      );
    }
    if (Object.keys(errors).length > 0) {
      // TODO: remove this and properly handle form validation errors
      console.log("errors", errors);
    }
    if (isHandlingPreflightChecks) {
      props.loadingText = "Running preflight checks...";
    }
    if (isCreatingContract) {
      props.loadingText = "Provisioning cluster...";
    }
    if (updateClusterResponse?.createContractResponse) {
      props.status = "";
    }

    return props;
  }, [
    isSubmitting,
    updateClusterResponse,
    updateClusterError,
    isHandlingPreflightChecks,
    isCreatingContract,
    errors,
  ]);

  const onSubmit = handleSubmit(async (data, skipPreflightChecks = false) => {
    setUpdateClusterResponse(undefined);
    setUpdateClusterError("");
    if (!currentContract?.cluster || !projectId) {
      return;
    }
    try {
      const response = await updateCluster(
        data,
        currentContract,
        skipPreflightChecks
      );
      setUpdateClusterResponse(response);
      if (response.preflightChecks) {
        void reportToAnalytics({
          projectId,
          step: "cluster-preflight-checks-failed",
          errorMessage: `Preflight checks failed: ${response.preflightChecks
            .map((c) => c.title)
            .join(", ")}`,
          clusterName: data.cluster.config.clusterName,
        });
        setShowFailedPreflightChecksModal(true);
      }
      if (response.createContractResponse) {
        void reportToAnalytics({
          projectId,
          step: "provisioning-started",
          provider: data.cluster.cloudProvider,
          region: data.cluster.config.region,
        });
        await api.saveOnboardingState(
          "<token>",
          { current_step: "clean_up" },
          { project_id: projectId }
        );
        await queryClient.invalidateQueries(["getCluster"]);

        if (redirectOnSubmit) {
          history.push(
            `/infrastructure/${response.createContractResponse.contract_revision.cluster_id}`
          );
        } else if (scrollToTopRef.current) {
          scrollToTopRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        void reportToAnalytics({
          projectId,
          step: "cluster-update-failed",
          errorMessage: err.message,
          provider: data.cluster.cloudProvider,
          clusterName: data.cluster.config.clusterName,
        });
        setUpdateClusterError(err.message);
        showIntercomWithMessage({
          message: "I am running into an issue updating my cluster.",
          delaySeconds: 3,
        });
      }
    }
  });

  return (
    <ClusterFormContext.Provider
      value={{
        setCurrentContract,
        showFailedPreflightChecksModal,
        updateClusterButtonProps,
        isAdvancedSettingsEnabled,
        isMultiClusterEnabled,
      }}
    >
      <Wrapper ref={scrollToTopRef}>
        <FormProvider {...clusterForm}>
          <form onSubmit={onSubmit}>{children}</form>
        </FormProvider>
        {showFailedPreflightChecksModal &&
          updateClusterResponse?.preflightChecks && (
            <PreflightChecksModal
              onClose={() => {
                setShowFailedPreflightChecksModal(false);
              }}
              preflightChecks={updateClusterResponse.preflightChecks}
            />
          )}
      </Wrapper>
    </ClusterFormContext.Provider>
  );
};

export default ClusterFormContextProvider;

const Wrapper = styled.div`
  height: fit-content;
  margin-bottom: 10px;
  width: 100%;
`;
