import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import document from "assets/document.svg";
import Button from "components/porter/Button";
import { ClientNotification } from "lib/porter-apps/notification";
import { feedDate } from "shared/string_utils";
import Container from "components/porter/Container";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";

type Props = {
  notification: ClientNotification;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
  scrollToTopRef: React.MutableRefObject<HTMLDivElement | null>;
}

const NotificationExpandedView: React.FC<Props> = ({
    notification,
    projectId,
    clusterId,
    appName,
    deploymentTargetId,
    appId,
    scrollToTopRef,
}) => {
  return (
    <StyledNotificationExpandedView>
      <ExpandedViewContent>
        <div ref={scrollToTopRef} style={{marginTop: "-40px", marginBottom: "40px"}}/>
        <Text color="helper">Event ID: {notification.id}</Text>
        <Spacer y={0.5} />
        <StyledActivityFeed>
          {notification.messages.map((message, i) => {
              return (
                  <NotificationWrapper isLast={i === notification.messages.length - 1} key={i}>
                      {i !== notification.messages.length - 1 && notification.messages.length > 1 && <Line />}
                      <Dot />
                      <Time>
                          <Text>{feedDate(message.timestamp)}</Text>
                      </Time>
                      <Message key={i}>
                        <Container row>
                          <img src={document} style={{width: "15px", marginRight: "15px"}} />
                          {message.human_readable_summary}
                        </Container>
                        <Spacer y={0.5} />
                        <Container row>
                          {message.human_readable_detail}
                        </Container>
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
      <ExpandedViewFooter>
        <Button>Take recommended action</Button>
      </ExpandedViewFooter>
    </StyledNotificationExpandedView>
  );
};

export default NotificationExpandedView;

const StyledNotificationExpandedView = styled.div`
width: 100%;
overflow-y: scroll;
display: flex;
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
justify-content: space-between;
::-webkit-scrollbar {
  width: 3px;
  :horizontal {
    height: 3px;
  }
}

::-webkit-scrollbar-corner {
  width: 3px;
  background: #ffffff11;
  color: white;
}

::-webkit-scrollbar-track {
  width: 3px;
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar-thumb {
  background-color: darkgrey;
  outline: 1px solid slategrey;
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

const ExpandedViewFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Time = styled.div`
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
  width: 150px;
`;

const Line = styled.div`
  width: 1px;
  height: calc(100% + 30px);
  background: #414141;
  position: absolute;
  left: 3px;
  top: 36px;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
`;

const Dot = styled.div`
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  margin-left: -29px;
  margin-right: 20px;
  z-index: 1;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
`;

const NotificationWrapper = styled.div<{isLast: boolean}>`
  padding-left: 30px;
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

const LogsContainer = styled.div`

`;
