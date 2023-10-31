import React from "react";
import styled from "styled-components";
import { PorterAppNotification } from "../activity-feed/events/types";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import document from "assets/document.svg";
import Button from "components/porter/Button";

type Props = {
  notification: PorterAppNotification;
}

const NotificationExpandedView: React.FC<Props> = ({
    notification,
}) => {
  return (
    <StyledNotificationExpandedView>
      <ExpandedViewContent>
        <Text color="helper">Event ID: {notification.id}</Text>
        <Spacer y={0.5} />
        <Text size={16}>{notification.human_readable_summary}</Text>
        <Spacer y={0.5} />
        <Message>
          <img src={document} />
          {notification.human_readable_detail}
        </Message>
        <Spacer y={0.5} />
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
display: flex;
flex-direction: column;
animation: fadeIn 0.3s 0s;
padding: 15px 20px;
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
border-bottom: 1px solid #494b4f;
border-right: 1px solid #494b4f;
justify-content: space-between;
`;

const ExpandedViewContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
`;

const ExpandedViewFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;