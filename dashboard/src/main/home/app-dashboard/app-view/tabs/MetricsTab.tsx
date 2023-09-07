import React, { useMemo } from "react";
import {ServiceWithName} from "lib/porter-apps/services";
import { useLatestRevision } from "../LatestRevisionContext";
import MetricsSection from "../../validate-apply/metrics/MetricsSection";

const MetricsTab: React.FC = () => {
    const { projectId, clusterId, latestProto , deploymentTargetId} = useLatestRevision();

    const appName = latestProto.name
    const services = Object.entries(latestProto.services).map(([name, service]): ServiceWithName => {
        return {
            name: name,
            service: service,
        }
    })

    return (
        <>
            <MetricsSection
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                services={services}
                deploymentTargetId={deploymentTargetId}
            />
        </>
    );
};

export default MetricsTab;
