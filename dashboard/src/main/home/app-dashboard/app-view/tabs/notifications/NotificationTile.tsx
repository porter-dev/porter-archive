import React from "react";
import styled from "styled-components";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { feedDate } from "shared/string_utils";
import { ClientNotification } from "lib/porter-apps/notification";

type Props = {
  notification: ClientNotification;
  selected: boolean;
  onClick: () => void;
};

const NotificationTile: React.FC<Props> = ({
  notification,
  selected,
  onClick,
}) => {
  return (
    <StyledNotificationTile onClick={onClick} selected={selected}>
      <NotificationContent>
        <Text color="helper">{feedDate(notification.timestamp)}</Text>
        <Spacer y={0.5} />
        <Text color="helper">Service: <ServiceName>{notification.serviceName}</ServiceName></Text>
        <Spacer y={0.5} />
        <NotificationSummary>{notification.isDeployRelated ? "Your service failed to deploy" : "Your service is unhealthy"}</NotificationSummary>
      </NotificationContent>
    </StyledNotificationTile>
  );
};

export default NotificationTile;

const StyledNotificationTile = styled.div<{ selected?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  padding: 15px 10px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 200px;
  cursor: pointer;
  position: relative;
  border-radius: 5px;
  background: ${props => props.selected ? props.theme.clickable.clickedBg : props.theme.clickable.bg};
  border: ${props => props.selected ? "1px solid #fff" : "1px solid #494b4f"};
  :hover {
    border: ${({ selected }) => (!selected && "1px solid #7a7b80")};
  }
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

const NotificationContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
`;

const NotificationSummary = styled.div`
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
`;

const ServiceName = styled.span`
  color: #ffffff;
`;