import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { type ClientServiceNotification } from "lib/porter-apps/notification";

import calendar from "assets/calendar-02.svg";
import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

import { isServiceNotification } from "../../activity-feed/events/types";
import ServiceMessage from "./messages/ServiceMessage";
import {
  ExpandedViewContent,
  StyledMessageFeed,
  StyledNotificationExpandedView,
} from "./NotificationExpandedView";

type Props = {
  notification: ClientServiceNotification;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
};

const ServiceNotificationExpandedView: React.FC<Props> = ({
  notification,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
  appId,
}) => {
  return (
    <StyledNotificationExpandedView>
      <ExpandedViewContent>
        <Container row spaced>
          <Container row>
            <ServiceNameTag>
              {match(notification.service.config.type)
                .with("web", () => <ServiceTypeIcon src={web} />)
                .with("worker", () => <ServiceTypeIcon src={worker} />)
                .with("job", () => <ServiceTypeIcon src={job} />)
                .with("predeploy", () => <ServiceTypeIcon src={job} />)
                .exhaustive()}
              <Spacer inline x={0.5} />
              {notification.service.name.value}
            </ServiceNameTag>
            <Spacer inline x={0.5} />
            <Text size={16} color={"#FFBF00"}>
              {notification.isDeployRelated
                ? "failed to deploy"
                : "is unhealthy"}
            </Text>
          </Container>
          {notification.service.config.type === "job" && (
            <Container row>
              <Tag>
                <TagIcon
                  src={calendar}
                  style={{ marginTop: "3px", marginLeft: "5px" }}
                />
                <Link
                  to={`/apps/${appName}/job-history?service=${notification.service.name.value}`}
                >
                  <Text size={16}>Job history</Text>
                </Link>
              </Tag>
            </Container>
          )}
        </Container>
        <Spacer y={0.5} />
        <StyledMessageFeed>
          {notification.messages
            .filter(isServiceNotification)
            .map((message, i) => (
              <ServiceMessage
                key={i}
                isFirst={i === 0}
                message={message}
                service={notification.service}
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                deploymentTargetId={deploymentTargetId}
                appId={appId}
                appRevisionId={notification.appRevisionId}
                showLiveLogs={notification.isDeployRelated}
              />
            ))}
        </StyledMessageFeed>
        <Spacer y={1} />
      </ExpandedViewContent>
    </StyledNotificationExpandedView>
  );
};

export default ServiceNotificationExpandedView;

export const ServiceNameTag = styled.div`
  display: flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 5px;
  background: #ffffff22;
  user-select: text;
  font-size: 16px;
`;

export const ServiceTypeIcon = styled.img`
  height: 16px;
  margin-top: 2px;
`;

const TagIcon = styled.img`
  height: 16px;
  margin-right: 3px;
`;
