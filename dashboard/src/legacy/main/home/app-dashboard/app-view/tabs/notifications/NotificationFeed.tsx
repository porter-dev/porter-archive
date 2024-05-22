import React from "react";
import Fieldset from "legacy/components/porter/Fieldset";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type DeploymentTarget } from "legacy/lib/hooks/useDeploymentTarget";
import { type ClientNotification } from "legacy/lib/porter-apps/notification";
import { useHistory, useLocation } from "react-router";
import styled from "styled-components";

import { useLatestRevision } from "../../LatestRevisionContext";
import { NotificationContextProvider } from "./expanded-views/NotificationContextProvider";
import NotificationExpandedView from "./expanded-views/NotificationExpandedView";
import NotificationList from "./NotificationList";

type Props = {
  notifications: ClientNotification[];
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTarget: DeploymentTarget;
  appId: number;
};

const NotificationFeed: React.FC<Props> = ({
  notifications,
  projectId,
  clusterId,
  appName,
  deploymentTarget,
  appId,
}) => {
  const { search } = useLocation();
  const { tabUrlGenerator } = useLatestRevision();
  const history = useHistory();
  const queryParams = new URLSearchParams(search);
  const notificationId = queryParams.get("notification_id");

  return (
    <StyledNotificationFeed>
      {notificationId ? (
        <NotificationContextProvider
          notificationId={notificationId}
          projectId={projectId}
          clusterId={clusterId}
          appName={appName}
        >
          <div>
            <Link
              to={tabUrlGenerator({
                tab: "notifications",
              })}
            >
              <BackButton>
                <i className="material-icons">keyboard_backspace</i>
                Notifications
              </BackButton>
            </Link>
            <Spacer y={0.25} />
            <NotificationExpandedView
              projectId={projectId}
              clusterId={clusterId}
              appName={appName}
              deploymentTargetId={deploymentTarget.id}
              appId={appId}
            />
          </div>
        </NotificationContextProvider>
      ) : notifications.length !== 0 ? (
        <NotificationList
          notifications={notifications}
          onNotificationClick={(notification: ClientNotification) => {
            history.push(
              tabUrlGenerator({
                tab: "notifications",
                queryParams: {
                  notification_id: notification.id,
                },
              })
            );
          }}
          projectId={projectId}
          clusterId={clusterId}
          appName={appName}
          deploymentTargetId={deploymentTarget.id}
        />
      ) : (
        <Fieldset>
          <Text size={16}>
            This application currently has no notifications.{" "}
          </Text>
          <Spacer height="15px" />
          <Text color="helper">
            No issues have been found. You will receive notifications here if we
            need to alert you about any issues with your services.
          </Text>
        </Fieldset>
      )}
    </StyledNotificationFeed>
  );
};

export default NotificationFeed;

const StyledNotificationFeed = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: -50px;
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

const BackButton = styled.div`
  display: flex;
  align-items: center;
  max-width: fit-content;
  cursor: pointer;
  font-size: 11px;
  max-height: fit-content;
  padding: 5px 13px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;
