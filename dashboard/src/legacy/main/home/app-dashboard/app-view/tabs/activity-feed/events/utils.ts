import { differenceInSeconds, intervalToDuration } from "date-fns";
import canceled from "legacy/assets/canceled.svg";
import failure from "legacy/assets/failure.svg";
import loading from "legacy/assets/loading.gif";
import healthy from "legacy/assets/status-healthy.png";
import api from "legacy/shared/api";
import { match } from "ts-pattern";

import { type PorterAppRecord } from "../../../AppView";
import {
  type PorterAppBuildEvent,
  type PorterAppDeployEvent,
  type PorterAppInitialDeployEvent,
  type PorterAppPreDeployEvent,
} from "./types";

const ZERO_TIME = "0001-01-01T00:00:00Z";

export const getDuration = (
  event:
    | PorterAppPreDeployEvent
    | PorterAppBuildEvent
    | PorterAppDeployEvent
    | PorterAppInitialDeployEvent
): string => {
  const startTimeStamp = match(event)
    .with({ type: "BUILD" }, (ev) => new Date(ev.created_at).getTime())
    .with({ type: "DEPLOY" }, (ev) => new Date(ev.created_at).getTime())
    .with({ type: "PRE_DEPLOY" }, (ev) =>
      new Date(ev.metadata.start_time).getTime()
    )
    .with({ type: "INITIAL_DEPLOY" }, (ev) =>
      new Date(ev.metadata.start_time).getTime()
    )
    .exhaustive();

  const endTimeStamp =
    event.metadata.end_time && event.metadata.end_time !== ZERO_TIME
      ? new Date(event.metadata.end_time).getTime()
      : Date.now();

  const timeDifferenceInSeconds = differenceInSeconds(
    endTimeStamp,
    startTimeStamp
  );
  const duration = intervalToDuration({
    start: 0,
    end: timeDifferenceInSeconds * 1000,
  });
  if (duration.weeks) {
    return `${duration.weeks}w ${duration.days}d ${duration.hours}h`;
  } else if (duration.days) {
    return `${duration.days}d ${duration.hours}h ${duration.minutes}m`;
  } else if (duration.hours) {
    return `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`;
  } else if (duration.minutes) {
    return `${duration.minutes}m ${duration.seconds}s`;
  } else {
    return `${duration.seconds}s`;
  }
};

export const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case "SUCCESS":
      return healthy;
    case "FAILED":
      return failure;
    case "PROGRESSING":
      return loading;
    case "CANCELED":
      return canceled;
    default:
      return loading;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case "SUCCESS":
      return "#68BF8B";
    case "FAILED":
      return "#FF6060";
    case "PROGRESSING":
      return "#6e9df5";
    case "CANCELED":
      return "#FFBF00";
    default:
      return "#6e9df5";
  }
};

export const triggerWorkflow = async ({
  projectId,
  clusterId,
  porterApp,
}: {
  projectId: number;
  clusterId: number;
  porterApp: PorterAppRecord;
}): Promise<void> => {
  if (porterApp.git_repo_id != null && porterApp.repo_name != null) {
    try {
      const res = await api.reRunGHWorkflow(
        "<token>",
        {},
        {
          project_id: projectId,
          cluster_id: clusterId,
          git_installation_id: porterApp.git_repo_id ?? 0,
          owner: porterApp.repo_name.split("/")[0],
          name: porterApp.repo_name.split("/")[1],
          branch: porterApp.git_branch,
          filename: "porter_stack_" + porterApp.name + ".yml",
        }
      );
      if (res.data != null) {
        window.open(res.data, "_blank", "noreferrer");
      }
    } catch (error) {}
  }
};
