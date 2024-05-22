import React, { createContext, useContext } from "react";
import notFound from "legacy/assets/not-found.png";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientAddon } from "legacy/lib/addons";
import {
  useAddon,
  useAddonStatus,
  type ClientAddonStatus,
} from "legacy/lib/hooks/useAddon";
import {
  useDefaultDeploymentTarget,
  type DeploymentTarget,
} from "legacy/lib/hooks/useDeploymentTarget";
import styled from "styled-components";

import { Context } from "shared/Context";

type AddonContextType = {
  addon: ClientAddon;
  projectId: number;
  deploymentTarget: DeploymentTarget;
  status: ClientAddonStatus;
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
  const { getAddon } = useAddon();
  const {
    addon,
    isLoading: isAddonLoading,
    isError,
  } = getAddon({
    projectId: currentProject?.id,
    deploymentTargetId: defaultDeploymentTarget.id,
    addonName,
    refreshIntervalSeconds: 5,
  });

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

  if (isDefaultDeploymentTargetLoading || isAddonLoading || !paramsExist) {
    return <Loading />;
  }

  if (isError || !addon) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No addon matching &quot;{addonName}&quot; was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/addons">Return to dashboard</Link>
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
