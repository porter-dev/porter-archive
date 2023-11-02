import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientNotification } from "lib/porter-apps/notification";

import NotificationExpandedView from "./NotificationExpandedView";
import NotificationList from "./NotificationList";

type Props = {
  notifications: ClientNotification[];
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
};

const NotificationFeed: React.FC<Props> = ({
  notifications,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
  appId,
}) => {
  const [selectedNotification, setSelectedNotification] = useState<
    ClientNotification | undefined
  >(notifications.length ? notifications[0] : undefined);
  const scrollToTopRef = useRef<HTMLDivElement | null>(null);

  const handleTileClick = (notification: ClientNotification): void => {
    setSelectedNotification(notification);
    scrollToTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    // if new notifications come in, select the first one if none are selected; otherwise, keep the current selection
    if (notifications.length && !selectedNotification) {
      setSelectedNotification(notifications[0]);
    } else if (
      selectedNotification &&
      notifications.find((n) => n.id === selectedNotification.id)
    ) {
      setSelectedNotification(
        notifications.find((n) => n.id === selectedNotification.id)
      );
    }
  }, [JSON.stringify(notifications)]);

  if (notifications.length === 0) {
    return (
      <Fieldset>
        <Text size={16}>
          No notifications found for &ldquo;{appName}&rdquo;
        </Text>
        <Spacer height="15px" />
        <Text color="helper">
          This application currently has no notifications.
        </Text>
      </Fieldset>
    );
  }

  return (
    <StyledNotificationFeed>
      {selectedNotification && (
        <>
          <NotificationList
            onTileClick={handleTileClick}
            notifications={notifications}
            selectedNotification={selectedNotification}
          />
          <NotificationExpandedView
            notification={selectedNotification}
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
            deploymentTargetId={deploymentTargetId}
            appId={appId}
            scrollToTopRef={scrollToTopRef}
          />
        </>
      )}
    </StyledNotificationFeed>
  );
};

export default NotificationFeed;

const StyledNotificationFeed = styled.div`
  display: flex;
  margin-bottom: -50px;
  height: 800px;
  width: 100%;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
