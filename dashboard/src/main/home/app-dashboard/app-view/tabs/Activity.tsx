import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import ActivityFeed from "./activity-feed/ActivityFeed";

const Activity: React.FC = () => {
    const { projectId, clusterId, latestProto, deploymentTargetId } = useLatestRevision();

    return (
        <>
            <ActivityFeed
                currentProject={projectId}
                currentCluster={clusterId}
                appName={latestProto.name}
                deploymentTargetId={deploymentTargetId}
            />
        </>
    );
};

export default Activity;
