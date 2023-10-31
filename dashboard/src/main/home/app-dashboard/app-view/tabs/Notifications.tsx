import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import NotificationFeed from "./notifications/NotificationFeed";

const Notifications: React.FC = () => {
  const {
    latestNotifications,
  } = useLatestRevision();

  return (
    <>
      <NotificationFeed
        notifications={latestNotifications}
      />
    </>
  );
};

export default Notifications;
