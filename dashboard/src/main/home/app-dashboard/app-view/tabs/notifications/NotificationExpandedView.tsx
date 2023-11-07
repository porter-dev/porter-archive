import React from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";
import { useIntercom } from "lib/hooks/useIntercom";
import { type ClientNotification } from "lib/porter-apps/notification";

import { feedDate } from "shared/string_utils";
import document from "assets/document.svg";
import time from "assets/time.svg";
import web from "assets/web.png";

type Props = {
  notification: ClientNotification;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
};

const NotificationExpandedView: React.FC<Props> = ({
  notification,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
  appId,
}) => {
  const { showIntercomWithMessage } = useIntercom();

  return (
    <StyledNotificationExpandedView>
      <ExpandedViewContent>
        <Container row>
          <ServiceNameTag>
            <ServiceTypeIcon src={web} />
            <Spacer inline x={0.5} />
            {notification.serviceName}
          </ServiceNameTag>
          <Spacer inline x={0.5} />
          <Text size={16} color={"#FFBF00"}>
            {notification.isDeployRelated ? "failed to deploy" : "is unhealthy"}
          </Text>
        </Container>
        <Spacer y={0.5} />
        <StyledActivityFeed>
          {notification.messages.map((message, i) => {
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
                    <Text color="helper">{message.error.mitigation_steps}</Text>
                  </Container>
                  <Spacer y={0.25} />
                  <Container row>
                    <Text color="helper">Need help debugging?</Text>
                    <Spacer inline x={0.5} />
                    <Button
                      onClick={() => {
                        showIntercomWithMessage({
                          message: `I need help debugging an issue with my application ${appName} in project ${projectId}.`,
                          delaySeconds: 0,
                        });
                      }}
                    >
                      Talk to support
                    </Button>
                  </Container>
                  {message.error.documentation.length > 0 && (
                    <>
                      <Spacer y={0.5} />
                      <Text>Relevant documentation:</Text>
                      <Spacer y={0.25} />
                      <ul>
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
                </Message>
              </NotificationWrapper>
            );
          })}
        </StyledActivityFeed>
        <Spacer y={1} />
        <LogsContainer>
          <Logs
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
            serviceNames={[notification.serviceName]}
            deploymentTargetId={deploymentTargetId}
            appRevisionId={notification.appRevisionId}
            logFilterNames={["service_name"]}
            appId={appId}
            selectedService={notification.serviceName}
            selectedRevisionId={notification.appRevisionId}
            defaultScrollToBottomEnabled={false}
          />
        </LogsContainer>
      </ExpandedViewContent>
      {/* uncomment below once we implement recommended actions */}
      {/* <ExpandedViewFooter>
        <Button>Take recommended action</Button>
      </ExpandedViewFooter> */}
    </StyledNotificationExpandedView>
  );
};

export default NotificationExpandedView;

const StyledNotificationExpandedView = styled.div`
  height: 100%;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  animation: fadeIn 0.3s 0s;
  padding: 70px;
  padding-top: 15px;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ExpandedViewContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const Message = styled.div`
  margin-left: 20px;
  width: 100%;
  padding: 20px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;
  line-height: 1.5em;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  opacity: 0;
  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
  user-select: text;
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

// const ExpandedViewFooter = styled.div`
//   display: flex;
//   justify-content: flex-end;
// `;

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

const NotificationWrapper = styled.div<{ isLast: boolean }>`
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: ${(props) => (props.isLast ? "" : "25px")};
`;

const StyledActivityFeed = styled.div`
  width: 100%;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const LogsContainer = styled.div``;
