import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
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
  const { search } = useLocation();
  const history = useHistory();
  const queryParams = new URLSearchParams(search);
  const notificationId = queryParams.get("notification_id");

  const [selectedNotification, setSelectedNotification] = useState<
    ClientNotification | undefined
  >(undefined);

  useEffect(() => {
    if (
      notificationId &&
      notifications.length &&
      notifications.find((n) => n.id === notificationId)
    ) {
      setSelectedNotification(
        notifications.find((n) => n.id === notificationId)
      );
    } else {
      setSelectedNotification(undefined);
    }
  }, [notificationId, JSON.stringify(notifications)]);

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
      {selectedNotification ? (
        <NotificationExpandedView
          notification={selectedNotification}
          projectId={projectId}
          clusterId={clusterId}
          appName={appName}
          deploymentTargetId={deploymentTargetId}
          appId={appId}
        />
      ) : (
        <NotificationList
          notifications={notifications}
          onNotificationClick={(notification: ClientNotification) => {
            history.push(
              `/apps/${appName}/notifications?notification_id=${notification.id}`
            );
          }}
        />
      )}
    </StyledNotificationFeed>
  );
};

export default NotificationFeed;

const StyledNotificationFeed = styled.div`
  display: flex;
  margin-bottom: -50px;
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
