import React from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useIntercom } from "lib/hooks/useIntercom";
import { type ClientRevisionNotification } from "lib/porter-apps/notification";

import { feedDate } from "shared/string_utils";
import chat from "assets/chat.svg";
import document from "assets/document.svg";
import time from "assets/time.svg";

import { isRevisionNotification } from "../../activity-feed/events/types";
import {
  ExpandedViewContent,
  Message,
  NotificationWrapper,
  StyledMessageFeed,
  StyledNotificationExpandedView,
} from "./NotificationExpandedView";

type Props = {
  notification: ClientRevisionNotification;
  projectId: number;
  appName: string;
};

const RevisionNotificationExpandedView: React.FC<Props> = ({
  notification,
  projectId,
  appName,
}) => {
  const { showIntercomWithMessage } = useIntercom();

  return (
    <StyledNotificationExpandedView>
      <ExpandedViewContent>
        <Container row spaced>
          <Container row>
            <Text size={16} color={"#FFBF00"}>
              The latest version failed to deploy
            </Text>
          </Container>
        </Container>
        <Spacer y={0.5} />
        <StyledMessageFeed>
          {notification.messages
            .filter(isRevisionNotification)
            .map((message, i) => {
              return (
                <NotificationWrapper key={i}>
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
                    <MessageDetailContainer>
                      {message.error.detail}
                    </MessageDetailContainer>
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

export default RevisionNotificationExpandedView;

const MessageDetailContainer = styled.div`
  background: #000000;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  width: 100%;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.border};
  align-items: center;
  font-family: monospace;
`;
