import React from "react";
import styled from "styled-components";

import pre_deploy from "assets/pre_deploy.png";

import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";

import { getDuration, getStatusColor, getStatusIcon, triggerWorkflow } from '../utils';
import { Code, ImageTagContainer, CommitIcon, StyledEventCard } from "./EventCard";
import Link from "components/porter/Link";
import document from "assets/document.svg";
import { PorterAppPreDeployEvent } from "../types";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import pull_request_icon from "assets/pull_request_icon.svg";
import { match } from "ts-pattern";

type Props = {
  event: PorterAppPreDeployEvent;
  appName: string;
  projectId: number;
  clusterId: number;
  gitCommitUrl: string;
  displayCommitSha: string;
};

const PreDeployEventCard: React.FC<Props> = ({ 
  event,
  appName,
  projectId, 
  clusterId,
  gitCommitUrl,
  displayCommitSha, 
}) => {
  const { porterApp } = useLatestRevision();

  const renderStatusText = (event: PorterAppPreDeployEvent) => {
    const color = getStatusColor(event.status);
    const text = match(event.status)
      .with("SUCCESS", () => "Pre-deploy successful")
      .with("FAILED", () => "Pre-deploy failed")
      .with("CANCELED", () => "Pre-deploy canceled")
      .otherwise(() => "Pre-deploy  in progress...")
    return <Text color={color}>{text}</Text>;
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={pre_deploy} />
          <Spacer inline width="10px" />
          <Text>Application pre-deploy</Text>
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
          <Wrapper>
            <Link to={`/apps/${appName}/events?event_id=${event.id}&service=${appName}-predeploy`} hasunderline>
              <Container row>
                <Icon src={document} height="10px" />
                <Spacer inline width="5px" />
                View pre-deploy logs
              </Container>
            </Link>
            {(event.status !== "SUCCESS") &&
              <>
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
              </>}
          </Wrapper>
          <Spacer inline x={1} />
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default PreDeployEventCard;

const Wrapper = styled.div`
  margin-top: -3px;
`;