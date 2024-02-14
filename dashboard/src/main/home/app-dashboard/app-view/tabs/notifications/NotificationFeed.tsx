import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router";
import styled from "styled-components";

import Fieldset from "components/porter/Fieldset";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type DeploymentTarget } from "lib/hooks/useDeploymentTarget";
import { type ClientNotification } from "lib/porter-apps/notification";

import { useLatestRevision } from "../../LatestRevisionContext";
import NotificationExpandedView from "./expanded-views/NotificationExpandedView";
import NotificationList from "./NotificationList";
import {useQuery} from "@tanstack/react-query";
import {emptyNotificationConfig, notificationConfigFormValidator} from "../../../../../../lib/notifications/types";
import api from "../../../../../../shared/api";
import {z} from "zod";
import {match} from "ts-pattern";
import Loading from "../../../../../../components/Loading";

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

  const [selectedNotification, setSelectedNotification] = useState<
    ClientNotification | undefined
  >(undefined);

  useEffect(() => {
    if (
      notificationId &&
      notifications.length &&
      notifications.find((n) => n.id === notificationId)
    ) {
      setSelectedNotification(
        notifications.find((n) => n.id === notificationId)
      );
    } else {
      setSelectedNotification(undefined);
    }
  }, [notificationId, JSON.stringify(notifications)]);

  return (
    <StyledNotificationFeed>
      {selectedNotification ? (
        <>
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
            notification={selectedNotification}
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
            deploymentTargetId={deploymentTarget.id}
            appId={appId}
          />
        </>
      ) :
          notifications.length !== 0 ?  (
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
      ) : <Fieldset>
            <Text size={16}>This application currently has no notifications. </Text>
            <Spacer height="15px" />
            <Text color="helper">
              You will receive notifications here if we need to alert you about any
              issues with your services.
            </Text>
          </Fieldset>}
    </StyledNotificationFeed>
  );
};

export default NotificationFeed;

type SetupNotificationProps = {
  notificationId: string;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTarget: DeploymentTarget;
  appId: number;
};

const SetupNotification: React.FC<SetupNotificationProps> = ({
                                                                 notificationId,
                                                                 projectId,
                                                                 clusterId,
                                                                 appName,
                                                                 deploymentTarget,
                                                                 appId,
                                                                         }) => {
  const configRes = useQuery(
      ["getNotification", notificationId],
      async () => {
        if (notificationId === 0) {
          return emptyNotificationConfig;
        }
        const res = await api.getNotificationConfig(
            "<token>",
            {},
            {
              project_id: projectID,
              notification_config_id: notificationConfigID,
            }
        );

        const object = await z
            .object({
              config: notificationConfigFormValidator,
            })
            .parseAsync(res.data);

        return object.config;
      }
  );

  return (
      <>
        {match(configRes)
            .with({ status: "loading" }, () => <Loading />)
            .with({ status: "success" }, ({ data }) => {
              return (
                  <NotificationConfigContainer
                      projectID={projectID}
                      slackIntegrationID={slackIntegrationID}
                      notificationConfigID={notificationConfigID}
                      existingConfig={data}
                  />
              );
            })
            .otherwise(() => null)}
      </>
  );
};

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
