import _ from "lodash";

import {
  isServiceNotification,
  type PorterAppNotification,
} from "main/home/app-dashboard/app-view/tabs/activity-feed/events/types";

import { type ClientService } from "./services";

export type ClientNotification = {
  isDeployRelated: boolean;
  messages: PorterAppNotification[];
  timestamp: string;
  id: string;
  appRevisionId: string;
  service: ClientService;
};

export function deserializeNotifications(
  notifications: PorterAppNotification[],
  clientServices: ClientService[]
): ClientNotification[] {
  const serviceNotifications = notifications.filter(isServiceNotification);

  const notificationsGroupedByService = _.groupBy(
    serviceNotifications,
    (notification) => notification.metadata.service_name
  );

  const clientServiceNotifications = clientServices
    .filter((svc) => notificationsGroupedByService[svc.name.value] != null)
    .map((svc) => {
      const serviceName = svc.name.value;
      const messages = orderNotificationsByTimestamp(
        notificationsGroupedByService[serviceName],
        "asc"
      );
      const timestamp = messages[0].timestamp;
      const id = messages[0].id;
      return {
        // if the deployment is PENDING for any of the notifications, assume that they are all related to the failing deployment
        // if not, then the deployment has already occurred
        isDeployRelated: notificationsGroupedByService[serviceName].some(
          (notification) =>
            notification.metadata.deployment.status === "PENDING" ||
            notification.metadata.deployment.status === "FAILURE"
        ),
        timestamp,
        id,
        messages,
        appRevisionId: messages[0].app_revision_id,
        service: svc,
      };
    });

  return orderNotificationsByTimestamp(clientServiceNotifications, "asc");
}

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
