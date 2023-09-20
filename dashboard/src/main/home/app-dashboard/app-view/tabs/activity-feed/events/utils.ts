import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import loading from "assets/loading.gif";
import canceled from "assets/canceled.svg"
import api from "shared/api";
import { PorterAppBuildEvent, PorterAppPreDeployEvent } from "./types";
import { PorterAppRecord } from "../../../AppView";
import { match } from "ts-pattern";
import { differenceInSeconds, formatDuration } from 'date-fns';

export const getDuration = (event: PorterAppPreDeployEvent | PorterAppBuildEvent): string => {
    const startTimeStamp = match(event)
        .with({ type: "BUILD" }, (ev) => new Date(ev.created_at).getTime())
        .with({ type: "PRE_DEPLOY" }, (ev) => new Date(ev.metadata.start_time).getTime())
        .exhaustive();

    const endTimeStamp = event.metadata.end_time ? new Date(event.metadata.end_time).getTime() : Date.now()

    const timeDifferenceInSeconds = differenceInSeconds(endTimeStamp, startTimeStamp);

    return formatDuration({ seconds: timeDifferenceInSeconds });
};

export const getStatusIcon = (status: string) => {
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

export const getStatusColor = (status: string) => {
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
}) => {
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

        } catch (error) {
            console.log(error);
        }
    }
};