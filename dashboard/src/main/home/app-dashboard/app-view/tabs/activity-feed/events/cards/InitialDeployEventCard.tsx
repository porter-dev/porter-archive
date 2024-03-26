import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { isClientServiceNotification } from "lib/porter-apps/notification";

import alert from "assets/alert-warning.svg";
import document from "assets/document.svg";
import pull_request_icon from "assets/pull_request_icon.svg";
import refresh from "assets/refresh.png";
import run_for from "assets/run_for.png";
import seed from "assets/seed.svg";
import tag_icon from "assets/tag.png";

import { type PorterAppInitialDeployEvent } from "../types";
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
  TagContainer,
} from "./EventCard";

type Props = {
  event: PorterAppInitialDeployEvent;
  projectId: number;
  clusterId: number;
  gitCommitUrl: string;
  displayCommitSha: string;
};

const InitialDeployEventCard: React.FC<Props> = ({
  event,
  projectId,
  clusterId,
  gitCommitUrl,
  displayCommitSha,
}) => {
  const { porterApp, latestClientNotifications, tabUrlGenerator } =
    useLatestRevision();

  const renderStatusText = (
    event: PorterAppInitialDeployEvent
  ): JSX.Element => {
    const color = getStatusColor(event.status);
    const text = match(event.status)
      .with("SUCCESS", () => "Initial deploy job successful")
      .with("FAILED", () => "Initial deploy job failed")
      .with("CANCELED", () => "Initial deploy job canceled")
      .otherwise(() => "Initial deploy job in progress...");
    return <Text color={color}>{text}</Text>;
  };

  const initialDeployNotificationsExist = useMemo(() => {
    return latestClientNotifications
      .filter(isClientServiceNotification)
      .some((notification) => {
        return (
          notification.service.config.type === "initdeploy" &&
          notification.appRevisionId === event.metadata.app_revision_id
        );
      });
  }, [JSON.stringify(latestClientNotifications)]);

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={seed} />
          <Spacer inline width="10px" />
          <Text>Application initial deploy</Text>
          {gitCommitUrl && displayCommitSha ? (
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
          ) : event.metadata.image_tag ? (
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer hoverable={false}>
                <TagContainer>
                  <CommitIcon src={tag_icon} />
                  <Code>{event.metadata.image_tag}</Code>
                </TagContainer>
              </ImageTagContainer>
            </>
          ) : null}
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
          <Tag>
            <Link
              to={tabUrlGenerator({
                tab: "events",
                queryParams: {
                  event_id: event.id,
                  service: "initialDeploy",
                  revision_id: event.metadata.app_revision_id,
                },
              })}
            >
              <TagIcon src={document} />
              Logs
            </Link>
          </Tag>
          {/* retry is not supported for docker initialDeploy atm */}
          {event.status !== "SUCCESS" && gitCommitUrl && (
            <>
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
            </>
          )}
          {initialDeployNotificationsExist && (
            <>
              <Spacer inline x={0.5} />
              <Container row>
                <Tag borderColor="#FFBF00">
                  <Link
                    to={tabUrlGenerator({
                      tab: "notifications",
                      queryParams: {},
                    })}
                    color={"#FFBF00"}
                  >
                    <TagIcon src={alert} />
                    Notifications
                  </Link>
                </Tag>
              </Container>
            </>
          )}
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default InitialDeployEventCard;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
