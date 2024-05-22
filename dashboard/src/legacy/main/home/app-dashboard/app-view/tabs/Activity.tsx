import React from "react";

import { useLatestRevision } from "../LatestRevisionContext";
import ActivityFeed from "./activity-feed/ActivityFeed";

const Activity: React.FC = () => {
  const { projectId, clusterId, latestProto, deploymentTarget } =
    useLatestRevision();

  return (
    <ActivityFeed
      projectId={projectId}
      clusterId={clusterId}
      appName={latestProto.name}
      deploymentTarget={deploymentTarget}
    />
  );
};

export default Activity;
