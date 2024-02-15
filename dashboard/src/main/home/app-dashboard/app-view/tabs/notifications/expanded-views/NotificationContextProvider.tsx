import React, { createContext } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  getClientNotificationById,
  type ClientNotification,
} from "lib/porter-apps/notification";

import notFound from "assets/not-found.png";

import { useLatestRevision } from "../../../LatestRevisionContext";

type NotificationContextType = {
  notification: ClientNotification;
};
export const NotificationContext =
  createContext<NotificationContextType | null>(null);

export const useNotificationContext = (): NotificationContextType => {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext must be used within a NotificationContextProvider"
    );
  }
  return ctx;
};

type NotificationContextProviderProps = {
  notificationId: string;
  children: JSX.Element;
  projectId: number;
  clusterId: number;
  appName: string;
};

export const NotificationContextProvider: React.FC<
  NotificationContextProviderProps
> = ({ notificationId, children, projectId, clusterId, appName }) => {
  const { latestClientNotifications, tabUrlGenerator } = useLatestRevision(); // this is essentially a cache

  const paramsExist =
    !!notificationId && !!projectId && !!clusterId && !!appName;
  const { data: notification, status } = useQuery(
    ["getNotification", notificationId, projectId, clusterId, appName],
    async () => {
      if (!paramsExist) {
        return;
      }
      const latestNotificationMatch = latestClientNotifications.find(
        (n) => n.id === notificationId
      );
      if (latestNotificationMatch) {
        return latestNotificationMatch;
      }
      const retrievedNotification = await getClientNotificationById({
        notificationId,
        projectId,
        clusterId,
        appName,
      });
      return retrievedNotification;
    },
    {
      enabled: paramsExist,
    }
  );

  if (status === "loading" || !paramsExist) {
    return <Loading />;
  }

  if (status === "error" || !notification) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No notification matching id: &quot;{notificationId}&quot; was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link
          to={tabUrlGenerator({
            tab: "notifications",
          })}
        >
          Return to notifications
        </Link>
      </Placeholder>
    );
  }

  return (
    <NotificationContext.Provider value={{ notification }}>
      {children}
    </NotificationContext.Provider>
  );
};

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;
const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;
