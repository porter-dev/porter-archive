import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import ActivityFeed from "./activity-feed/ActivityFeed";

const Notifications: React.FC = () => {
  const {
    projectId,
    clusterId,
    latestProto,
    deploymentTarget,
  } = useLatestRevision();

  return (
    <>
      <ActivityFeed
        currentProject={projectId}
        currentCluster={clusterId}
        appName={latestProto.name}
        deploymentTargetId={deploymentTarget.id}
      />
    </>
  );
};

export default Notifications;
