import React, { useMemo } from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import MetricsSection from "../../validate-apply/metrics/MetricsSection";

const MetricsTab: React.FC = () => {
    const { projectId, clusterId, latestProto , deploymentTargetId} = useLatestRevision();

    const appName = latestProto.name

    return (
        <>
            <MetricsSection
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                services={latestProto.services}
                deploymentTargetId={deploymentTargetId}
            />
        </>
    );
};

export default MetricsTab;
