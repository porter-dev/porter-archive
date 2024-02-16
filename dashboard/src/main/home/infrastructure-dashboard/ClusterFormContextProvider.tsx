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
import { useIntercom } from "lib/hooks/useIntercom";

import PreflightChecksModal from "./modals/PreflightChecksModal";

// todo(ianedwards): refactor button to use more predictable state
export type UpdateClusterButtonProps = {
  status: "" | "loading" | JSX.Element | "success";
  isDisabled: boolean;
  loadingText: string;
};

type ClusterFormContextType = {
  isAdvancedSettingsEnabled: boolean;
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
  redirectOnSubmit?: boolean;
  children: JSX.Element;
};

const ClusterFormContextProvider: React.FC<ClusterFormContextProviderProps> = ({
  projectId,
  isAdvancedSettingsEnabled = false,
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

  const clusterForm = useForm<ClientClusterContract>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clusterContractValidator),
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
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
  ]);

  const onSubmit = handleSubmit(async (data) => {
    setUpdateClusterResponse(undefined);
    setUpdateClusterError("");
    if (!currentContract?.cluster) {
      return;
    }
    try {
      const response = await updateCluster(data, currentContract);
      setUpdateClusterResponse(response);
      if (response.preflightChecks) {
        setShowFailedPreflightChecksModal(true);
      }
      if (response.createContractResponse) {
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
        setUpdateClusterError(err.message);
        showIntercomWithMessage({
          message: "I am running into an issue updating my cluster.",
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
