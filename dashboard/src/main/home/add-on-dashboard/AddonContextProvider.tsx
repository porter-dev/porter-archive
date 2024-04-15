import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientAddon } from "lib/addons";
import {
  useAddon,
  useAddonList,
  useAddonStatus,
  type ClientAddonStatus,
} from "lib/hooks/useAddon";
import {
  useDefaultDeploymentTarget,
  type DeploymentTarget,
} from "lib/hooks/useDeploymentTarget";

import { Context } from "shared/Context";
import notFound from "assets/not-found.png";

type AddonContextType = {
  addon: ClientAddon;
  projectId: number;
  deploymentTarget: DeploymentTarget;
  status: ClientAddonStatus;
  deleteAddon: () => Promise<void>;
};

const AddonContext = createContext<AddonContextType | null>(null);

export const useAddonContext = (): AddonContextType => {
  const ctx = React.useContext(AddonContext);
  if (!ctx) {
    throw new Error(
      "useAddonContext must be used within a AddonContextProvider"
    );
  }
  return ctx;
};

type AddonContextProviderProps = {
  addonName?: string;
  children: JSX.Element;
};

export const AddonContextProvider: React.FC<AddonContextProviderProps> = ({
  addonName,
  children,
}) => {
  const { currentProject } = useContext(Context);
  const { defaultDeploymentTarget, isDefaultDeploymentTargetLoading } =
    useDefaultDeploymentTarget();
  const {
    addons,
    isLoading: isAddonListLoading,
    isError,
  } = useAddonList({
    projectId: currentProject?.id,
    deploymentTargetId: defaultDeploymentTarget.id,
  });
  const { deleteAddon } = useAddon();
  const queryClient = useQueryClient();

  // TODO: add getAddon call to backend
  const addon = useMemo(() => {
    return addons.find((a) => a.name.value === addonName);
  }, [addons]);

  const status = useAddonStatus({
    projectId: currentProject?.id,
    deploymentTarget: defaultDeploymentTarget,
    addon,
  });

  const paramsExist =
    !!addonName &&
    !!defaultDeploymentTarget &&
    !!currentProject &&
    currentProject.id !== -1;

  const deleteContextAddon = useCallback(async () => {
    if (!paramsExist || !addon) {
      return;
    }

    await deleteAddon({
      projectId: currentProject.id,
      deploymentTargetId: defaultDeploymentTarget.id,
      addon,
    });

    await queryClient.invalidateQueries(["listAddons"]);
  }, [paramsExist]);

  if (isDefaultDeploymentTargetLoading || isAddonListLoading || !paramsExist) {
    return <Loading />;
  }

  if (isError || !addon) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No datastore matching &quot;{addonName}&quot; was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/datastores">Return to dashboard</Link>
      </Placeholder>
    );
  }

  return (
    <AddonContext.Provider
      value={{
        addon,
        projectId: currentProject.id,
        deploymentTarget: defaultDeploymentTarget,
        status,
        deleteAddon: deleteContextAddon,
      }}
    >
      {children}
    </AddonContext.Provider>
  );
};

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;
const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;
