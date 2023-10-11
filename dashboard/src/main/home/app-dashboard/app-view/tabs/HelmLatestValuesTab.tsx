import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import HelmLatestValues from "../../validate-apply/helm/HelmLatestValues";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";

const HelmLatestValuesTab: React.FC = () => {
    const { projectId, clusterId, latestProto, deploymentTarget, porterApp, latestRevision } = useLatestRevision();

    const appName = latestProto.name

    return (
        <>
        <Text color="helper">
            This tab is only visible to Porter operators.
        </Text>
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
