import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { type PorterAppRecord } from "main/home/app-dashboard/app-view/AppView";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

import build from "assets/build.png";
import document from "assets/document.svg";
import pull_request_icon from "assets/pull_request_icon.svg";
import refresh from "assets/refresh.png";
import run_for from "assets/run_for.png";

import { type PorterAppBuildEvent } from "../types";
import {
  getDuration,
  getStatusColor,
  getStatusIcon,
  triggerWorkflow,
} from "../utils";
import {
  Code,
  CommitIcon,
  ImageTagContainer,
  StyledEventCard,
} from "./EventCard";

type Props = {
  event: PorterAppBuildEvent;
  appName: string;
  projectId: number;
  clusterId: number;
  gitCommitUrl: string;
  displayCommitSha: string;
  porterApp: PorterAppRecord;
};

const BuildEventCard: React.FC<Props> = ({
  event,
  projectId,
  clusterId,
  gitCommitUrl,
  displayCommitSha,
  porterApp,
}) => {
  const { linkToTabGenerator } = useLatestRevision();

  const renderStatusText = (event: PorterAppBuildEvent): JSX.Element => {
    const color = getStatusColor(event.status);
    return (
      <StatusContainer color={color}>
        {match(event.status)
          .with("SUCCESS", () => "Build successful")
          .with("FAILED", () => "Build failed")
          .with("CANCELED", () => "Build canceled")
          .otherwise(() => "Build in progress...")}
      </StatusContainer>
    );
  };

  const renderLogsAndRetry = (): JSX.Element => {
    return (
      <Container row>
        <Tag>
          <Link
            to={linkToTabGenerator({
              tab: "events",
              queryParams: { event_id: event.id },
            })}
          >
            <TagIcon src={document} />
            Logs
          </Link>
        </Tag>
        <Spacer inline x={0.5} />
        <Tag>
          <Link
            onClick={async () => {
              await triggerWorkflow({
                projectId,
                clusterId,
                porterApp,
              });
            }}
          >
            <TagIcon src={refresh} />
            Retry
          </Link>
        </Tag>
      </Container>
    );
  };

  const renderInfoCta = (event: PorterAppBuildEvent): JSX.Element | null => {
    switch (event.status) {
      case "SUCCESS":
        return null;
      case "CANCELED":
        return renderLogsAndRetry();
      case "FAILED":
        return renderLogsAndRetry();
      default:
        return (
          <Container row>
            <Tag>
              <Link
                target="_blank"
                to={`https://github.com/${porterApp.repo_name}/actions/runs/${event.metadata.action_run_id}`}
                showTargetBlankIcon={false}
              >
                <TagIcon src={document} />
                Live logs
              </Link>
            </Tag>
          </Container>
        );
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={build} />
          <Spacer inline width="10px" />
          <Text>Application build</Text>
          {gitCommitUrl && displayCommitSha && (
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer>
                <Link
                  to={gitCommitUrl}
                  target="_blank"
                  showTargetBlankIcon={false}
                >
                  <CommitIcon src={pull_request_icon} />
                  <Code>{displayCommitSha}</Code>
                </Link>
              </ImageTagContainer>
            </>
          )}
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Container row>
          <Icon height="12px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText(event)}
          <Spacer inline x={1} />
          {renderInfoCta(event)}
          <Spacer inline x={1} />
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default BuildEventCard;

const StatusContainer = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  color: ${(props) => props.color};
  font-size: 13px;
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
