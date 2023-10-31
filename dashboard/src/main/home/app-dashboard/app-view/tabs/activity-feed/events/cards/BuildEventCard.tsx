import React from "react";
import styled from "styled-components";

import build from "assets/build.png";

import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";
import { getDuration, getStatusColor, getStatusIcon, triggerWorkflow } from '../utils';
import { Code, ImageTagContainer, CommitIcon, StyledEventCard } from "./EventCard";
import document from "assets/document.svg";
import { PorterAppBuildEvent } from "../types";
import { match } from "ts-pattern";
import pull_request_icon from "assets/pull_request_icon.svg";
import { PorterAppRecord } from "main/home/app-dashboard/app-view/AppView";

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
  appName, 
  projectId, 
  clusterId,
  gitCommitUrl,
  displayCommitSha, 
  porterApp,
}) => {
  const renderStatusText = (event: PorterAppBuildEvent) => {
    const color = getStatusColor(event.status);
    return (
      <StatusContainer color={color}>
        {match(event.status)
          .with("SUCCESS", () => "Build successful")
          .with("FAILED", () => "Build failed")
          .otherwise(() => "Build in progress...")
        }
      </StatusContainer>
    );
  };

  const renderInfoCta = (event: PorterAppBuildEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return null;
      case "FAILED":
        return (
          <Wrapper>
            <Link to={`/apps/${appName}/events?event_id=${event.id}`} hasunderline>
              <Container row>
                <Icon src={document} height="10px" />
                <Spacer inline width="5px" />
                View logs
              </Container>
            </Link>
            <Spacer inline x={1} />
            <Link hasunderline onClick={() => triggerWorkflow({
              projectId,
              clusterId,
              porterApp,
            })}>
              <Container row>
                <Icon height="10px" src={refresh} />
                <Spacer inline width="5px" />
                Retry
              </Container>
            </Link>
          </Wrapper>
        );
      default:
        return (
          <Wrapper>
            <Link
              hasunderline
              target="_blank"
              to={`https://github.com/${porterApp.repo_name}/actions/runs/${event.metadata.action_run_id}`}
            >
              View live logs
            </Link>
            <Spacer inline x={1} />
          </Wrapper>
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
          {gitCommitUrl && displayCommitSha &&
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer>
                <Link to={gitCommitUrl} target="_blank" showTargetBlankIcon={false}>
                  <CommitIcon src={pull_request_icon} />
                  <Code>{displayCommitSha}</Code>
                </Link>
              </ImageTagContainer> 
            </>
          }
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

const Wrapper = styled.div`
  display: flex;
  height: 20px;
  margin-top: -3px;
`;

const StatusContainer = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  color: ${props => props.color};
  font-size: 13px;
`;
