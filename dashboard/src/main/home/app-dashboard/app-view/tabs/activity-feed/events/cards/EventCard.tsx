import React from "react";
import styled from "styled-components";

import BuildEventCard from "./BuildEventCard";
import PreDeployEventCard from "./PreDeployEventCard";
import AppEventCard from "./AppEventCard";
import DeployEventCard from "./DeployEventCard";
import { PorterAppEvent } from "../types";
import { match } from "ts-pattern";

type Props = {
  event: PorterAppEvent;
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  isLatestDeployEvent?: boolean;
};

const EventCard: React.FC<Props> = ({ event, deploymentTargetId, isLatestDeployEvent, projectId, clusterId, appName }) => {
  return match(event)
    .with({ type: "APP_EVENT" }, (ev) => <AppEventCard event={ev} deploymentTargetId={deploymentTargetId} projectId={projectId} clusterId={clusterId} appName={appName} />)
    .with({ type: "BUILD" }, (ev) => <BuildEventCard event={ev} projectId={projectId} clusterId={clusterId} appName={appName} />)
    .with({ type: "DEPLOY" }, (ev) => <DeployEventCard event={ev} appName={appName} showServiceStatusDetail={isLatestDeployEvent} />)
    .with({ type: "PRE_DEPLOY" }, (ev) => <PreDeployEventCard event={ev} appName={appName} projectId={projectId} clusterId={clusterId} />)
    .exhaustive();
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
