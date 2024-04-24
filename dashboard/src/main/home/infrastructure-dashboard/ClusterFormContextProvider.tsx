import React, { createContext, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Contract } from "@porter-dev/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import { Error as ErrorComponent } from "components/porter/Error";
import {
  clusterContractValidator,
  machineTypeValidator,
  type ClientClusterContract,
  type ClientPreflightCheck,
  type MachineType,
  type UpdateClusterResponse,
} from "lib/clusters/types";
import {
  uniqueCidrMetadataValidator,
  useUpdateCluster,
} from "lib/hooks/useCluster";
import { useClusterAnalytics } from "lib/hooks/useClusterAnalytics";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";

import PreflightChecksModal from "./modals/PreflightChecksModal";

// todo(ianedwards): refactor button to use more predictable state
export type UpdateClusterButtonProps = {
  status: "" | "loading" | JSX.Element | "success";
  isDisabled: boolean;
  loadingText?: string;
};

type ClusterFormContextType = {
  isAdvancedSettingsEnabled: boolean;
  isMultiClusterEnabled: boolean;
  showFailedPreflightChecksModal: boolean;
  updateClusterButtonProps: UpdateClusterButtonProps;
  setCurrentContract: (contract: Contract) => void;
  submitSkippingPreflightChecks: () => Promise<void>;
  submitAndPatchCheckSuggestions: (args: {
    preflightChecks: ClientPreflightCheck[];
  }) => Promise<void>;
  availableMachineTypes: (
    cloud_provider: string,
    cloud_provider_credential_identifier: string,
    region: string
  ) => Promise<MachineType[]>;
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
    setValue,
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

  const handleClusterUpdate = async (
    data: ClientClusterContract,
    skipPreflightChecks?: boolean
  ): Promise<void> => {
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
  };

  const onSubmit = handleSubmit(async (data) => {
    await handleClusterUpdate(data);
  });

  const availableMachineTypes = async (
    cloudProvider: string,
    cloudProviderCredentialIdentifier: string,
    region: string
  ): Promise<MachineType[]> => {
    const response = await api.cloudProviderMachineTypes(
      "<token>",
      {
        cloud_provider: cloudProvider,
        cloud_provider_credential_identifier: cloudProviderCredentialIdentifier,
        region,
      },
      {
        project_id: projectId,
      }
    );
    const parsed = await z
      .object({
        machine_types: z.array(machineTypeValidator),
      })
      .parseAsync(response.data);

    return parsed.machine_types;
  };

  const submitSkippingPreflightChecks = async (): Promise<void> => {
    if (clusterForm.formState.isSubmitting) {
      return;
    }
    if (!currentContract?.cluster) {
      return;
    }
    const fullValuesWithDefaults = clusterContractValidator.parse(
      clusterForm.getValues()
    );
    await handleClusterUpdate(fullValuesWithDefaults, true);
  };

  const submitAndPatchCheckSuggestions = async ({
    preflightChecks,
  }: {
    preflightChecks: ClientPreflightCheck[];
  }): Promise<void> => {
    if (clusterForm.formState.isSubmitting) {
      return;
    }
    if (!currentContract?.cluster) {
      return;
    }

    preflightChecks.forEach((check) => {
      match(check).with({ name: "enforceCidrUniqueness" }, () => {
        const parsedMetadata = uniqueCidrMetadataValidator.parse(
          check.error?.metadata
        );
        setValue(
          "cluster.config.serviceCidrRange",
          parsedMetadata["suggested-service-cidr"]
        );
        setValue(
          "cluster.config.cidrRange",
          parsedMetadata["suggested-vpc-cidr"]
        );
      });
    });

    void onSubmit();
  };

  return (
    <ClusterFormContext.Provider
      value={{
        setCurrentContract,
        showFailedPreflightChecksModal,
        updateClusterButtonProps,
        isAdvancedSettingsEnabled,
        isMultiClusterEnabled,
        submitSkippingPreflightChecks,
        submitAndPatchCheckSuggestions,
        availableMachineTypes,
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
