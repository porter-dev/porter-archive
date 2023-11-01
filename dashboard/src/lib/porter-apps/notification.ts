import _ from "lodash";
import { PorterAppNotification } from "main/home/app-dashboard/app-view/tabs/activity-feed/events/types";

export type ClientNotification = {
    isDeployRelated: boolean;
    serviceName: string;
    messages: PorterAppNotification[];
    timestamp: string;
    id: string;
    appRevisionId: string;
}

export function deserializeNotifications (
    notifications: PorterAppNotification[] 
): ClientNotification[] {
    const deployRelatedNotificationMap = _.groupBy(notifications.filter(
        (notification) => notification.deployment.status === "PENDING"
    ), (notification) => notification.service_name);
    const deployRelatedNotifications = Object.keys(deployRelatedNotificationMap).map(
        (serviceName) => {
            const notifications = orderNotificationsByTimestamp(deployRelatedNotificationMap[serviceName], 'asc');
            const timestamp = notifications[0].timestamp;
            const id = notifications[0].id;
            return {
                isDeployRelated: true,
                serviceName,
                timestamp,
                id,
                messages: notifications,
                appRevisionId: notifications[0].app_revision_id
            };
        }
    );
    const nonDeployRelatedNotifications = notifications.filter(
        (notification) => notification.deployment.status !== "PENDING"
    ).map(
        (notification) => {
            return {
                isDeployRelated: false,
                serviceName: notification.service_name,
                timestamp: notification.timestamp,
                id: notification.id,
                messages: [notification],
                appRevisionId: notification.app_revision_id
            };
        }
    );
    
    return orderNotificationsByTimestamp([...deployRelatedNotifications, ...nonDeployRelatedNotifications], 'asc');
}

const orderNotificationsByTimestamp = <T extends {timestamp: string}[]>(notifications: T, sortOrder: 'asc' | 'desc'): T => {
    return notifications.sort((a, b) => {
        const aTimestamp = new Date(a.timestamp);
        const bTimestamp = new Date(b.timestamp);
        if (sortOrder === 'asc') {
            return aTimestamp.getTime() - bTimestamp.getTime();
        } else {
            return bTimestamp.getTime() - aTimestamp.getTime();
        }
    });
}
