import React from "react";
import styled from "styled-components";

import BuildEventCard from "./BuildEventCard";
import PreDeployEventCard from "./PreDeployEventCard";
import AppEventCard from "./AppEventCard";
import DeployEventCard from "./DeployEventCard";
import { PorterAppDeployEvent, PorterAppEvent, PorterAppEventType } from "../types";

type Props = {
  event: PorterAppEvent;
  appData: any;
  isLatestDeployEvent?: boolean;
};

const EventCard: React.FC<Props> = ({ event, appData, isLatestDeployEvent }) => {
  const renderEventCard = (event: PorterAppEvent) => {
    switch (event.type) {
      case PorterAppEventType.APP_EVENT:
        return <AppEventCard event={event} appData={appData} />;
      case PorterAppEventType.BUILD:
        return <BuildEventCard event={event} appData={appData} />;
      case PorterAppEventType.DEPLOY:
        return <DeployEventCard event={event as PorterAppDeployEvent} appData={appData} showServiceStatusDetail={isLatestDeployEvent} />;
      case PorterAppEventType.PRE_DEPLOY:
        return <PreDeployEventCard event={event} appData={appData} />;
      default:
        return null;
    };
  };

  return renderEventCard(event);
};

export default EventCard;

export const StyledEventCard = styled.div<{ row?: boolean }>`
  width: 100%;
  padding: 15px;
  display: flex;
  flex-direction: ${({ row }) => row ? "row" : "column"};
  justify-content: space-between;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  opacity: 0;
  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
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
