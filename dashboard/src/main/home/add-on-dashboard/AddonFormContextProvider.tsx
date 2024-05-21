import React, { createContext, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Contract } from "@porter-dev/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import { Error as ErrorComponent } from "components/porter/Error";
import { clientAddonValidator, type ClientAddon } from "lib/addons";
import { updateExistingClusterContract } from "lib/clusters";
import { type ClientPreflightCheck } from "lib/clusters/types";
import { useAddon } from "lib/hooks/useAddon";
import {
  getErrorMessageFromNetworkCall,
  preflightChecks,
} from "lib/hooks/useCluster";
import { useDefaultDeploymentTarget } from "lib/hooks/useDeploymentTarget";

import { useClusterContext } from "../infrastructure-dashboard/ClusterContextProvider";
import ClusterFormContextProvider, {
  type UpdateClusterButtonProps,
} from "../infrastructure-dashboard/ClusterFormContextProvider";
import PreflightChecksModal from "../infrastructure-dashboard/modals/PreflightChecksModal";

type AddonFormContextType = {
  updateAddonButtonProps: UpdateClusterButtonProps;
  projectId: number;
};

const AddonFormContext = createContext<AddonFormContextType | null>(null);

export const useAddonFormContext = (): AddonFormContextType => {
  const ctx = React.useContext(AddonFormContext);
  if (!ctx) {
    throw new Error(
      "useAddonFormContext must be used within a AddonFormContextProvider"
    );
  }
  return ctx;
};

type AddonFormContextProviderProps = {
  projectId?: number;
  redirectOnSubmit?: boolean;
  children: JSX.Element;
};

const AddonFormContextProvider: React.FC<AddonFormContextProviderProps> = ({
  projectId,
  redirectOnSubmit,
  children,
}) => {
  const [updateAddonError, setUpdateAddonError] = useState<string>("");
  const [failingPreflightChecks, setFailingPreflightChecks] = useState<
    ClientPreflightCheck[]
  >([]);
  const [isCheckingQuotas, setIsCheckingQuotas] = useState<boolean>(false);
  const { cluster } = useClusterContext();

  const { defaultDeploymentTarget } = useDefaultDeploymentTarget();
  const { updateAddon } = useAddon();
  const queryClient = useQueryClient();
  const history = useHistory();

  const addonForm = useForm<ClientAddon>({
    reValidateMode: "onSubmit",
    resolver: zodResolver(clientAddonValidator),
  });
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
  } = addonForm;

  const modelAddonPreflightChecks = async (
    addon: ClientAddon,
    projectId: number
  ): Promise<ClientPreflightCheck[] | undefined> => {
    // TODO: figure out why data.template is undefined here. If it is defined, we can use data.template.isModelTemplate instead of hardcoding the type
    if (
      addon.config.type === "deepgram" &&
      cluster.contract?.config &&
      cluster.contract.config.cluster.cloudProvider === "AWS"
    ) {
      let clientContract = cluster.contract.config;
      if (
        !clientContract.cluster.config.nodeGroups.some(
          (n) => n.nodeGroupType === "CUSTOM"
        )
      ) {
        clientContract = {
          ...clientContract,
          cluster: {
            ...clientContract.cluster,
            config: {
              ...clientContract.cluster.config,
              nodeGroups: [
                ...clientContract.cluster.config.nodeGroups,
                {
                  nodeGroupType: "CUSTOM",
                  instanceType: "g4dn.xlarge",
                  minInstances: 0,
                  maxInstances: 1,
                },
              ],
            },
          },
        };
      }
      const contract = Contract.fromJsonString(
        atob(cluster.contract.base64_contract),
        {
          ignoreUnknownFields: true,
        }
      );
      const contractCluster = contract.cluster;
      if (contractCluster) {
        const newContract = new Contract({
          ...contract,
          cluster: updateExistingClusterContract(
            clientContract,
            contractCluster
          ),
        });
        setIsCheckingQuotas(true);
        const preflightCheckResults = await preflightChecks(
          newContract,
          projectId
        );
        return preflightCheckResults;
      }
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!projectId) {
      return;
    }
    setFailingPreflightChecks([]);
    setUpdateAddonError("");
    try {
      const preflightCheckResults = await modelAddonPreflightChecks(
        data,
        projectId
      );
      if (preflightCheckResults) {
        setFailingPreflightChecks(preflightCheckResults);
      }
      setIsCheckingQuotas(false);
      await updateAddon({
        projectId,
        deploymentTargetId: defaultDeploymentTarget.id,
        addon: data,
      });

      await queryClient.invalidateQueries(["getAddon"]);

      if (redirectOnSubmit) {
        history.push(`/addons/${data.name.value}`);
      }
    } catch (err) {
      setUpdateAddonError(
        getErrorMessageFromNetworkCall(err, "Addon deployment")
      );
    }
  });

  const updateAddonButtonProps = useMemo(() => {
    const props: UpdateClusterButtonProps = {
      status: "",
      isDisabled: false,
      loadingText: "Deploying addon...",
    };
    if (isSubmitting) {
      props.status = "loading";
      props.isDisabled = true;
    }
    if (isCheckingQuotas) {
      props.loadingText = "Checking quotas...";
    }

    if (updateAddonError) {
      props.status = (
        <ErrorComponent message={updateAddonError} maxWidth="600px" />
      );
    }
    if (Object.keys(errors).length > 0) {
      // TODO: remove this and properly handle form validation errors
      console.log("errors", errors);
    }

    return props;
  }, [isSubmitting, errors, errors?.name?.value, isCheckingQuotas]);

  if (!projectId) {
    return <Loading />;
  }

  return (
    <AddonFormContext.Provider
      value={{
        updateAddonButtonProps,
        projectId,
      }}
    >
      <Wrapper>
        <FormProvider {...addonForm}>
          <form onSubmit={onSubmit}>{children}</form>
        </FormProvider>
        {failingPreflightChecks.length > 0 && (
          <ClusterFormContextProvider projectId={projectId}>
            <PreflightChecksModal
              onClose={() => {
                setFailingPreflightChecks([]);
              }}
              preflightChecks={failingPreflightChecks}
            />
          </ClusterFormContextProvider>
        )}
      </Wrapper>
    </AddonFormContext.Provider>
  );
};

export default AddonFormContextProvider;

const Wrapper = styled.div`
  height: fit-content;
  margin-bottom: 10px;
  width: 100%;
`;
