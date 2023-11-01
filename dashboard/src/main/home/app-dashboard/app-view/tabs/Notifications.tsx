import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import NotificationFeed from "./notifications/NotificationFeed";

const Notifications: React.FC = () => {
  const {
    latestNotifications,
    projectId,
    clusterId,
    appName,
    porterApp: { id: appId },
    deploymentTarget: { id: deploymentTargetId },
  } = useLatestRevision();

  return (
    <>
      <NotificationFeed
        notifications={latestNotifications}
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        deploymentTargetId={deploymentTargetId}
        appId={appId}
      />
    </>
  );
};

export default Notifications;
