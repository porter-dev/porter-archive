import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { ERROR_CODE_TO_SUMMARY } from "lib/porter-apps/error";
import {
  isClientRevisionNotification,
  isClientServiceNotification,
  type ClientNotification,
} from "lib/porter-apps/notification";

import { feedDate } from "shared/string_utils";
import job from "assets/job.png";
import web from "assets/web.png";
import worker from "assets/worker.png";

type Props = {
  notification: ClientNotification;
  onClick: () => void;
  revisionIdToNumber: Record<string, number>;
};

const NotificationTile: React.FC<Props> = ({
  notification,
  onClick,
  revisionIdToNumber,
}) => {
  const matchingVersionNumber = useMemo(() => {
    if (
      (isClientRevisionNotification(notification) ||
        isClientServiceNotification(notification)) &&
      revisionIdToNumber[notification.appRevisionId]
    ) {
      return revisionIdToNumber[notification.appRevisionId];
    }
    return 0;
  }, [JSON.stringify(notification), JSON.stringify(revisionIdToNumber)]);

  const summary = useMemo(() => {
    return match(notification)
      .with({ scope: "REVISION" }, () => {
        return notification.messages.length &&
          ERROR_CODE_TO_SUMMARY[notification.messages[0].error.code]
          ? ERROR_CODE_TO_SUMMARY[notification.messages[0].error.code]
          : "The latest version failed to deploy";
      })
      .with({ scope: "SERVICE" }, (n) => {
        return n.isDeployRelated
          ? "A service failed to deploy"
          : ["job", "predeploy"].includes(n.service.config.type)
          ? "A job run encountered issues"
          : "A service was unhealthy";
      })
      .with({ scope: "APPLICATION" }, () => {
        return "The application failed to deploy";
      })
      .otherwise(() => {
        return "";
      });
  }, [JSON.stringify(notification)]);

  return (
    <StyledNotificationTile onClick={onClick}>
      <Container row>
        <Container row style={{ width: "200px" }}>
          <NotificationSummary>{summary}</NotificationSummary>
        </Container>
        <Spacer inline x={0.5} />
        <Container row style={{ width: "120px" }}>
          <Text color="helper">{feedDate(notification.timestamp)}</Text>
        </Container>
        <Spacer inline x={0.5} />
        <Container row style={{ gap: "10px" }}>
          {isClientServiceNotification(notification) && (
            <Container row>
              <Tag hoverable={false}>
                {match(notification.service.config.type)
                  .with("web", () => <ServiceTypeIcon src={web} />)
                  .with("worker", () => <ServiceTypeIcon src={worker} />)
                  .with("job", () => <ServiceTypeIcon src={job} />)
                  .with("predeploy", () => <ServiceTypeIcon src={job} />)
                  .exhaustive()}
                <Spacer inline x={0.5} />
                <Text>{notification.service.name.value}</Text>
              </Tag>
            </Container>
          )}
          {matchingVersionNumber !== 0 && (
            <Container row style={{ width: "200px" }}>
              <Tag hoverable={false}>
                <Text>{`Version ${matchingVersionNumber}`}</Text>
              </Tag>
            </Container>
          )}
        </Container>
      </Container>
      <Container row style={{ paddingRight: "10px" }}>
        <StatusDot color={"#FFBF00"} />
      </Container>
    </StyledNotificationTile>
  );
};

export default NotificationTile;

const StyledNotificationTile = styled.div`
  user-select: none;
  padding: 15px 10px;
  cursor: pointer;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
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
  display: flex;
  justify-content: space-between;
`;

const NotificationSummary = styled.div`
  color: #ffbf00;
  font-size: 13px;
  font-weight: 500;
`;

const ServiceTypeIcon = styled.img`
  height: 13px;
  margin-top: 4px;
`;

const StatusDot = styled.div<{ color: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  margin-left: 10px;
  border-radius: 50%;
  background: ${({ color }) => color};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.9);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;
