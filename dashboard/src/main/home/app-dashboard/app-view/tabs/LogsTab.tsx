import React from "react";
import Logs from "../../validate-apply/logs/Logs"
import { useLatestRevision } from "../LatestRevisionContext";

const LogsTab: React.FC = () => {
    const { projectId, clusterId, latestProto, deploymentTargetId, latestRevision } = useLatestRevision();

    const appName = latestProto.name
    const serviceNames = Object.keys(latestProto.services)

    return (
        <Logs
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
            serviceNames={serviceNames}
            deploymentTargetId={deploymentTargetId}
            latestRevision={latestRevision}
        />
    );
};

export default LogsTab;
