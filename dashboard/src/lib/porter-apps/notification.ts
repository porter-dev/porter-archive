import _ from "lodash";

import {
  isRevisionNotification,
  isServiceNotification,
  type PorterAppNotification,
} from "main/home/app-dashboard/app-view/tabs/activity-feed/events/types";

import { type ClientService } from "./services";

type BaseClientNotification = {
  id: string;
  timestamp: string;
  messages: PorterAppNotification[];
};

export type ClientServiceNotification = BaseClientNotification & {
  scope: "SERVICE";
  service: ClientService;
  isDeployRelated: boolean;
  appRevisionId: string;
};

export type ClientRevisionNotification = BaseClientNotification & {
  scope: "REVISION";
  isDeployRelated: boolean;
  appRevisionId: string;
};

type ClientApplicationNotification = BaseClientNotification & {
  scope: "APPLICATION";
};

export type ClientNotification =
  | ClientServiceNotification
  | ClientRevisionNotification
  | ClientApplicationNotification;

export const isClientServiceNotification = (
  notification: ClientNotification
): notification is ClientServiceNotification => {
  return notification.scope === "SERVICE";
};
export const isClientRevisionNotification = (
  notification: ClientNotification
): notification is ClientRevisionNotification => {
  return notification.scope === "REVISION";
};

export function deserializeNotifications(
  notifications: PorterAppNotification[],
  clientServices: ClientService[]
): ClientNotification[] {
  const revisionNotifications = orderNotificationsByTimestamp(
    clientRevisionNotifications(notifications),
    "asc"
  );
  const serviceNotifications = orderNotificationsByTimestamp(
    clientServiceNotifications(notifications, clientServices),
    "asc"
  );

  return [...revisionNotifications, ...serviceNotifications];
}

const clientServiceNotifications = (
  notifications: PorterAppNotification[],
  clientServices: ClientService[]
): ClientServiceNotification[] => {
  const serviceNotifications = notifications.filter(isServiceNotification);

  const notificationsGroupedByService = _.groupBy(
    serviceNotifications,
    (notification) => notification.metadata.service_name
  );

  return clientServices
    .filter((svc) => notificationsGroupedByService[svc.name.value] != null)
    .map((svc) => {
      const serviceName = svc.name.value;
      const messages = orderNotificationsByTimestamp(
        notificationsGroupedByService[serviceName],
        "asc"
      );
      const parentMessage = messages[0];
      const timestamp = parentMessage.timestamp;
      const id = parentMessage.id;
      const appRevisionId = parentMessage.app_revision_id;
      return {
        scope: "SERVICE",
        // if the deployment is PENDING or FAILURE for any of the notifications, assume that they are all related to the failing deployment
        // if not, then the deployment has already occurred
        isDeployRelated: notificationsGroupedByService[serviceName].some(
          (notification) =>
            notification.metadata.deployment.status === "PENDING" ||
            notification.metadata.deployment.status === "FAILURE"
        ),
        timestamp,
        id,
        messages,
        appRevisionId,
        service: svc,
      };
    });
};

const clientRevisionNotifications = (
  notifications: PorterAppNotification[]
): ClientRevisionNotification[] => {
  const revisionNotifications = notifications.filter(isRevisionNotification);
  const messages = orderNotificationsByTimestamp(revisionNotifications, "asc");
  if (messages.length === 0) {
    return [];
  }
  const parentMessage = messages[0];
  const timestamp = parentMessage.timestamp;
  const id = parentMessage.id;
  const appRevisionId = parentMessage.app_revision_id;
  return [
    {
      scope: "REVISION",
      id,
      timestamp,
      isDeployRelated: true,
      messages,
      appRevisionId,
    },
  ];
};

const orderNotificationsByTimestamp = <T extends Array<{ timestamp: string }>>(
  notifications: T,
  sortOrder: "asc" | "desc"
): T => {
  return notifications.sort((a, b) => {
    const aTimestamp = new Date(a.timestamp);
    const bTimestamp = new Date(b.timestamp);
    if (sortOrder === "asc") {
      return aTimestamp.getTime() - bTimestamp.getTime();
    } else {
      return bTimestamp.getTime() - aTimestamp.getTime();
    }
  });
};
