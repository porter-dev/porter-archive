import React, { createContext } from "react";
import { useQuery } from "@tanstack/react-query";
import notFound from "legacy/assets/not-found.png";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  getClientNotificationById,
  type ClientNotification,
} from "legacy/lib/porter-apps/notification";
import styled from "styled-components";

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
  const { latestClientNotifications, tabUrlGenerator, loading } =
    useLatestRevision(); // this is essentially a cache

  const paramsExist =
    !!notificationId && !!projectId && !!clusterId && !!appName && !loading;
  const { data: notification, status } = useQuery(
    [
      "getNotification",
      notificationId,
      projectId,
      clusterId,
      appName,
      loading,
      latestClientNotifications,
    ],
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

      const latestNotificationMatchNested = latestClientNotifications.find(
        (n) => {
          return n.messages.find((m) => m.id === notificationId);
        }
      );

      if (latestNotificationMatchNested) {
        return latestNotificationMatchNested;
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
