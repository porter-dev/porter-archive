import React, { useContext } from "react";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { Context } from "shared/Context";

import HelmLatestValues from "../../validate-apply/helm/HelmLatestValues";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  featureFlagEnabled: boolean;
};

const HelmLatestValuesTab: React.FC<Props> = ({ featureFlagEnabled }) => {
  const { user } = useContext(Context);
  const { projectId, clusterId, latestProto, deploymentTarget, porterApp } =
    useLatestRevision();

  const appName = latestProto.name;

  return (
    <>
      {user?.isPorterUser && !featureFlagEnabled && (
        <Text color="helper">
          This tab is only visible to Porter operators.
        </Text>
      )}
      <Spacer y={1} />
      <HelmLatestValues
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        deploymentTargetId={deploymentTarget.id}
        appId={porterApp.id}
      />
    </>
  );
};

export default HelmLatestValuesTab;
