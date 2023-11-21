import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import styled from "styled-components";
import { match } from "ts-pattern";

import Button from "components/porter/Button";
import CollapsibleContainer from "components/porter/CollapsibleContainer";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";
import { useIntercom } from "lib/hooks/useIntercom";
import { type ClientServiceNotification } from "lib/porter-apps/notification";

import { feedDate } from "shared/string_utils";
import calendar from "assets/calendar-02.svg";
import chat from "assets/chat.svg";
import document from "assets/document.svg";
import job from "assets/job.png";
import time from "assets/time.svg";
import web from "assets/web.png";
import worker from "assets/worker.png";

import { isServiceNotification } from "../../activity-feed/events/types";
import {
  ExpandedViewContent,
  Message,
  NotificationWrapper,
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
  const { showIntercomWithMessage } = useIntercom();
  const [logsVisible, setLogsVisible] = useState<boolean>(false);

  const serviceNames = useMemo(() => {
    if (notification.service.config.type === "predeploy") {
      return ["predeploy"];
    }
    return [notification.service.name.value];
  }, [JSON.stringify(notification)]);

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
            .map((message, i) => {
              return (
                <NotificationWrapper
                  isLast={i === notification.messages.length - 1}
                  key={i}
                >
                  <Message key={i}>
                    <Container row spaced>
                      <Container row>
                        <img
                          src={document}
                          style={{ width: "15px", marginRight: "15px" }}
                        />
                        {message.error.summary}
                      </Container>
                      <Container row>
                        <img
                          src={time}
                          style={{ width: "15px", marginRight: "15px" }}
                        />
                        <Text>{feedDate(message.timestamp)}</Text>
                      </Container>
                    </Container>
                    <Spacer y={0.5} />
                    <Text>Details:</Text>
                    <Spacer y={0.25} />
                    <Container row>
                      <Text color="helper">{message.error.detail}</Text>
                    </Container>
                    <Spacer y={0.5} />
                    <Text>Resolution steps:</Text>
                    <Spacer y={0.25} />
                    <Container row>
                      <Text color="helper">
                        {message.error.mitigation_steps}
                      </Text>
                    </Container>
                    <Spacer y={0.25} />
                    <Container row>
                      <Text color="helper">Need help troubleshooting?</Text>
                      <Spacer inline x={0.5} />
                      <Button
                        onClick={() => {
                          showIntercomWithMessage({
                            message: `I need help troubleshooting an issue with my application ${appName} in project ${projectId}.`,
                            delaySeconds: 0,
                          });
                        }}
                      >
                        <img
                          src={chat}
                          style={{ width: "15px", marginRight: "10px" }}
                        />
                        Talk to support
                      </Button>
                    </Container>
                    {message.error.documentation.length > 0 && (
                      <>
                        <Spacer y={0.5} />
                        <Text>Relevant documentation:</Text>
                        <Spacer y={0.25} />
                        <ul
                          style={{
                            paddingInlineStart: "12px",
                            marginTop: "0px",
                          }}
                        >
                          {message.error.documentation.map((doc, i) => {
                            return (
                              <li key={i}>
                                <a href={doc} target="_blank" rel="noreferrer">
                                  {doc}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}

                    {notification.service.config.type !== "job" &&
                      message.error.should_view_logs && (
                        <>
                          <Container row>
                            <Tag>
                              <i className="material-icons-outlined">
                                {logsVisible
                                  ? "keyboard_arrow_up"
                                  : "keyboard_arrow_down"}
                              </i>
                              <Link
                                onClick={() => {
                                  setLogsVisible(!logsVisible);
                                }}
                              >
                                <Text size={16}>Logs</Text>
                              </Link>
                            </Tag>
                          </Container>
                          <CollapsibleContainer isOpened={logsVisible}>
                            <Spacer y={0.5} />
                            <Logs
                              projectId={projectId}
                              clusterId={clusterId}
                              appName={appName}
                              serviceNames={serviceNames}
                              deploymentTargetId={deploymentTargetId}
                              appRevisionId={notification.appRevisionId}
                              logFilterNames={["service_name"]}
                              appId={appId}
                              selectedService={serviceNames[0]}
                              selectedRevisionId={notification.appRevisionId}
                              defaultScrollToBottomEnabled={false}
                              timeRange={{
                                startTime: dayjs(message.timestamp).subtract(
                                  1,
                                  "minute"
                                ),
                                endTime: dayjs(message.timestamp).add(
                                  1,
                                  "minute"
                                ),
                              }}
                            />
                          </CollapsibleContainer>
                        </>
                      )}
                  </Message>
                </NotificationWrapper>
              );
            })}
        </StyledMessageFeed>
        <Spacer y={1} />
      </ExpandedViewContent>
    </StyledNotificationExpandedView>
  );
};

export default ServiceNotificationExpandedView;

const ServiceNameTag = styled.div`
  display: flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 5px;
  background: #ffffff22;
  user-select: text;
  font-size: 16px;
`;

const ServiceTypeIcon = styled.img`
  height: 16px;
  margin-top: 2px;
`;

const TagIcon = styled.img`
  height: 16px;
  margin-right: 3px;
`;
