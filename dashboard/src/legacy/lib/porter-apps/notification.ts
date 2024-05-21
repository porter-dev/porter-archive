import { PorterApp } from "@porter-dev/api-contracts";
import _ from "lodash";
import { z } from "zod";

import {
  isRevisionNotification,
  isServiceNotification,
  porterAppNotificationEventMetadataValidator,
  type PorterAppNotification,
} from "main/home/app-dashboard/app-view/tabs/activity-feed/events/types";
import { appRevisionValidator } from "lib/revisions/types";

import api from "shared/api";
import { valueExists } from "shared/util";

import { clientAppFromProto } from ".";
import {
  ERROR_CODE_APPLICATION_ROLLBACK,
  ERROR_CODE_APPLICATION_ROLLBACK_FAILED,
} from "./error";
import { type ClientService } from "./services";

type BaseClientNotification = {
  id: string;
  timestamp: string;
  messages: PorterAppNotification[];
  isHistorical: boolean; // refers to whether the notification currently applies or not
};

export type ClientServiceNotification = BaseClientNotification & {
  scope: "SERVICE";
  service: ClientService;
  isDeployRelated: boolean;
  appRevisionId: string;
};

export type ClientRevisionNotification = BaseClientNotification & {
  scope: "REVISION";
  appRevisionId: string;
  isRollbackRelated: boolean;
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

export function deserializeNotifications({
  notifications,
  clientServices,
  revisionId,
  isHistorical,
}: {
  notifications: PorterAppNotification[];
  clientServices: ClientService[];
  revisionId: string;
  isHistorical: boolean;
}): ClientNotification[] {
  const revisionNotifications = orderNotificationsByTimestamp(
    clientRevisionNotifications(notifications, isHistorical),
    "asc"
  );
  const serviceNotifications = orderNotificationsByTimestamp(
    clientServiceNotifications(
      notifications,
      clientServices,
      revisionId,
      isHistorical
    ),
    "asc"
  );

  return [...revisionNotifications, ...serviceNotifications];
}

const clientServiceNotifications = (
  notifications: PorterAppNotification[],
  clientServices: ClientService[],
  revisionId: string,
  isHistorical: boolean
): ClientServiceNotification[] => {
  const serviceNotifications = notifications
    .filter((n) => n.app_revision_id === revisionId)
    .filter(isServiceNotification);

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
        isHistorical,
      };
    });
};

const clientRevisionNotifications = (
  notifications: PorterAppNotification[],
  isHistorical: boolean
): ClientRevisionNotification[] => {
  const revisionNotifications = notifications.filter(isRevisionNotification);

  return revisionNotifications.map((notification) => {
    const timestamp = notification.timestamp;
    const id = notification.id;
    const appRevisionId = notification.app_revision_id;
    return {
      scope: "REVISION",
      id,
      timestamp,
      messages: [notification],
      appRevisionId,
      isRollbackRelated:
        notification.error.code === ERROR_CODE_APPLICATION_ROLLBACK ||
        notification.error.code === ERROR_CODE_APPLICATION_ROLLBACK_FAILED,
      isHistorical,
    };
  });
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

// TODO: make this generic so that latestrevisioncontext can use the same function
export const getClientNotificationById = async ({
  notificationId,
  projectId,
  clusterId,
  appName,
}: {
  notificationId: string;
  projectId: number;
  clusterId: number;
  appName: string;
}): Promise<ClientNotification | undefined> => {
  try {
    const res = await api.getNotification(
      "<token>",
      {},
      {
        project_id: projectId,
        notification_id: notificationId,
      }
    );
    const { notification: porterAppNotification } = await z
      .object({
        notification: porterAppNotificationEventMetadataValidator,
      })
      .parseAsync(res.data);
    const revisionId = porterAppNotification.app_revision_id;
    const revisionRes = await api.getRevision(
      "<token>",
      {},
      {
        project_id: projectId,
        cluster_id: clusterId,
        porter_app_name: appName,
        revision_id: revisionId,
      }
    );
    const { app_revision: appRevision } = await z
      .object({ app_revision: appRevisionValidator })
      .parseAsync(revisionRes.data);

    const proto = PorterApp.fromJsonString(atob(appRevision.b64_app_proto), {
      ignoreUnknownFields: true,
    });
    const appFromRevision = clientAppFromProto({ proto, overrides: null });
    const servicesFromRevision = [
      ...appFromRevision.services,
      appFromRevision.predeploy?.length
        ? appFromRevision.predeploy[0]
        : undefined,
    ].filter(valueExists);

    const notifications = deserializeNotifications({
      notifications: [porterAppNotification],
      clientServices: servicesFromRevision,
      revisionId,
      isHistorical: true,
    });

    if (notifications.length > 1) {
      return;
    }
    return notifications[0];
  } catch (err) {}
};
