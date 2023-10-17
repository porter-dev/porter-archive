import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import MetricsSection from "../../validate-apply/metrics/MetricsSection";

const MetricsTab: React.FC = () => {
    const { projectId, clusterId, latestProto, latestClientServices, deploymentTarget} = useLatestRevision();

    const appName = latestProto.name

    return (
        <>
            <MetricsSection
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                services={latestClientServices}
                deploymentTargetId={deploymentTarget.id}
            />
        </>
    );
};

export default MetricsTab;
