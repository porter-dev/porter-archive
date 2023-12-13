import React from "react";
import styled from "styled-components";

import { useRevisionList } from "lib/hooks/useRevisionList";
import { type ClientNotification } from "lib/porter-apps/notification";

import NotificationTile from "./NotificationTile";

type Props = {
  notifications: ClientNotification[];
  onNotificationClick: (notification: ClientNotification) => void;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
};

const NotificationList: React.FC<Props> = ({
  notifications,
  onNotificationClick,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
}) => {
  const { revisionIdToNumber } = useRevisionList({
    projectId,
    clusterId,
    appName,
    deploymentTargetId,
  });
  return (
    <StyledNotificationList>
      {notifications.map((notif) => (
        <NotificationTile
          key={notif.id}
          notification={notif}
          onClick={() => {
            onNotificationClick(notif);
          }}
          revisionIdToNumber={revisionIdToNumber}
        />
      ))}
    </StyledNotificationList>
  );
};

export default NotificationList;

const StyledNotificationList = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: auto;
  ::-webkit-scrollbar {
    width: 3px;
    :horizontal {
      height: 3px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 3px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 3px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;
