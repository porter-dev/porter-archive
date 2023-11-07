import _ from "lodash";

import { type PorterAppNotification } from "main/home/app-dashboard/app-view/tabs/activity-feed/events/types";

export type ClientNotification = {
  isDeployRelated: boolean;
  serviceName: string;
  messages: PorterAppNotification[];
  timestamp: string;
  id: string;
  appRevisionId: string;
};

export function deserializeNotifications(
  notifications: PorterAppNotification[]
): ClientNotification[] {
  const notificationsGroupedByService = _.groupBy(
    notifications,
    (notification) => notification.service_name
  );

  const clientNotifications = Object.keys(notificationsGroupedByService).map(
    (serviceName) => {
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
          (notification) => notification.deployment.status === "PENDING"
        ),
        serviceName,
        timestamp,
        id,
        messages,
        appRevisionId: messages[0].app_revision_id,
      };
    }
  );

  return orderNotificationsByTimestamp(clientNotifications, "asc");
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
