import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import { type ClientNotification } from "lib/porter-apps/notification";

import RevisionNotificationExpandedView from "./RevisionNotificationExpandedView";
import ServiceNotificationExpandedView from "./ServiceNotificationExpandedView";

type Props = {
  notification: ClientNotification;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
};

const NotificationExpandedView: React.FC<Props> = ({
  notification,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
  appId,
}) => {
  return match(notification)
    .with({ scope: "SERVICE" }, (n) => (
      <ServiceNotificationExpandedView
        notification={n}
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        deploymentTargetId={deploymentTargetId}
        appId={appId}
      />
    ))
    .with({ scope: "REVISION" }, (n) => (
      <RevisionNotificationExpandedView
        notification={n}
        projectId={projectId}
        appName={appName}
        deploymentTargetId={deploymentTargetId}
        clusterId={clusterId}
        appId={appId}
      />
    ))
    .with({ scope: "APPLICATION" }, () => null) // not implemented yet
    .exhaustive();
};

export default NotificationExpandedView;

export const StyledNotificationExpandedView = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  animation: fadeIn 0.3s 0s;
  padding: 70px;
  padding-top: 15px;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const ExpandedViewContent = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Message = styled.div`
  margin-left: 20px;
  width: 100%;
  padding: 20px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;
  line-height: 1.5em;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  opacity: 0;
  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
  user-select: text;
  @keyframes slideIn {
    from {
      margin-left: -10px;
      opacity: 0;
      margin-right: 10px;
    }
    to {
      margin-left: 0;
      opacity: 1;
      margin-right: 0;
    }
  }
`;

export const NotificationWrapper = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

export const StyledMessageFeed = styled.div`
  width: 100%;
  animation: fadeIn 0.3s 0s;
  display: flex;
  flex-direction: column;
  gap: 20px;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
