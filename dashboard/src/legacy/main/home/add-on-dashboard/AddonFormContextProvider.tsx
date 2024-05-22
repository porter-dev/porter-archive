import React, { createContext, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Loading from "legacy/components/Loading";
import { Error as ErrorComponent } from "legacy/components/porter/Error";
import { clientAddonValidator, type ClientAddon } from "legacy/lib/addons";
import { useAddon } from "legacy/lib/hooks/useAddon";
import { getErrorMessageFromNetworkCall } from "legacy/lib/hooks/useCluster";
import { useDefaultDeploymentTarget } from "legacy/lib/hooks/useDeploymentTarget";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import { type UpdateClusterButtonProps } from "../infrastructure-dashboard/ClusterFormContextProvider";

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

  const onSubmit = handleSubmit(async (data) => {
    if (!projectId) {
      return;
    }
    setUpdateAddonError("");
    try {
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
  }, [isSubmitting, errors, errors?.name?.value]);

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
