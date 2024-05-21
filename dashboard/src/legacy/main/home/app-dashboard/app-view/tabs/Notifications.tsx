import React from "react";

import { useLatestRevision } from "../LatestRevisionContext";
import NotificationFeed from "./notifications/NotificationFeed";

const Notifications: React.FC = () => {
  const {
    latestClientNotifications,
    projectId,
    clusterId,
    appName,
    porterApp: { id: appId },
    deploymentTarget,
  } = useLatestRevision();

  return (
    <NotificationFeed
      notifications={latestClientNotifications}
      projectId={projectId}
      clusterId={clusterId}
      appName={appName}
      deploymentTarget={deploymentTarget}
      appId={appId}
    />
  );
};

export default Notifications;
