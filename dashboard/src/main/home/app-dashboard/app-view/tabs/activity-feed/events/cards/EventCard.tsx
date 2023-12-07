import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

import { type PorterAppEvent } from "../types";
import BuildEventCard from "./BuildEventCard";
import DeployEventCard from "./DeployEventCard";
import PreDeployEventCard from "./PreDeployEventCard";

type Props = {
  event: PorterAppEvent;
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  isLatestDeployEvent?: boolean;
};

const EventCard: React.FC<Props> = ({
  event,
  deploymentTargetId,
  isLatestDeployEvent,
  projectId,
  clusterId,
  appName,
}) => {
  const { porterApp } = useLatestRevision();

  const gitCommitUrl = useMemo(() => {
    if (!porterApp.repo_name) {
      return "";
    }

    return (
      match(event)
        .with({ type: "APP_EVENT" }, () => "")
        .with({ type: "NOTIFICATION" }, () => "")
        .with({ type: "BUILD" }, (event) =>
          event.metadata.commit_sha
            ? `https://www.github.com/${porterApp.repo_name}/commit/${event.metadata.commit_sha}`
            : ""
        )
        // TODO: remove check for commit_sha when update flow is GA'd
        .with({ type: "PRE_DEPLOY" }, (event) =>
          event.metadata.commit_sha
            ? `https://www.github.com/${porterApp.repo_name}/commit/${event.metadata.commit_sha}`
            : event.metadata.image_tag
            ? `https://www.github.com/${porterApp.repo_name}/commit/${event.metadata.image_tag}`
            : ""
        )
        .with({ type: "DEPLOY" }, (event) =>
          event.metadata.image_tag
            ? `https://www.github.com/${porterApp.repo_name}/commit/${event.metadata.image_tag}`
            : ""
        )
        .exhaustive()
    );
  }, [JSON.stringify(event), porterApp]);

  const displayCommitSha = useMemo(() => {
    if (!porterApp.repo_name) {
      return "";
    }

    return (
      match(event)
        .with({ type: "APP_EVENT" }, () => "")
        .with({ type: "NOTIFICATION" }, () => "")
        .with({ type: "BUILD" }, (event) =>
          event.metadata.commit_sha ? event.metadata.commit_sha.slice(0, 7) : ""
        )
        // TODO: remove check for commit_sha when update flow is GA'd
        .with({ type: "PRE_DEPLOY" }, (event) =>
          event.metadata.commit_sha
            ? event.metadata.commit_sha.slice(0, 7)
            : event.metadata.image_tag
            ? event.metadata.image_tag.slice(0, 7)
            : ""
        )
        .with({ type: "DEPLOY" }, (event) =>
          event.metadata.image_tag ? event.metadata.image_tag.slice(0, 7) : ""
        )
        .exhaustive()
    );
  }, [JSON.stringify(event), porterApp]);

  return match(event)
    .with({ type: "APP_EVENT" }, () => null) // we do not show app events in the activity feed, we convert them to notifications
    .with({ type: "NOTIFICATION" }, () => null) // we do not show notifications in the activity feed, rather in the notifications tab
    .with({ type: "BUILD" }, (ev) => (
      <BuildEventCard
        event={ev}
        projectId={projectId}
        clusterId={clusterId}
        appName={appName}
        gitCommitUrl={gitCommitUrl}
        displayCommitSha={displayCommitSha}
        porterApp={porterApp}
      />
    ))
    .with({ type: "DEPLOY" }, (ev) => (
      <DeployEventCard
        event={ev}
        appName={appName}
        showServiceStatusDetail={isLatestDeployEvent}
        deploymentTargetId={deploymentTargetId}
        projectId={projectId}
        clusterId={clusterId}
        gitCommitUrl={gitCommitUrl}
        displayCommitSha={displayCommitSha}
      />
    ))
    .with({ type: "PRE_DEPLOY" }, (ev) => (
      <PreDeployEventCard
        event={ev}
        appName={appName}
        projectId={projectId}
        clusterId={clusterId}
        gitCommitUrl={gitCommitUrl}
        displayCommitSha={displayCommitSha}
      />
    ))
    .exhaustive();
};

export default EventCard;

export const StyledEventCard = styled.div<{ row?: boolean }>`
  width: 100%;
  padding: 15px;
  display: flex;
  flex-direction: ${({ row }) => (row ? "row" : "column")};
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

export const Code = styled.span`
  font-family: monospace;
`;

export const CommitIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;

export const ImageTagContainer = styled.div<{ hoverable?: boolean }>`
  display: flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 5px;
  background: #ffffff22;
  user-select: text;
  ${({ hoverable = true }) =>
    hoverable &&
    `:hover {
    background: #ffffff44;
    cursor: pointer;
  }`}
`;
