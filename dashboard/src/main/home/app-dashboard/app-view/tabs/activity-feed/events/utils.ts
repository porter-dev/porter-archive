import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import loading from "assets/loading.gif";
import canceled from "assets/canceled.svg"
import api from "shared/api";
import { PorterAppEvent } from "./types";
import { SourceOptions } from "lib/porter-apps";
import { PorterAppRecord } from "../../../AppView";

export const getDuration = (event: PorterAppEvent): string => {
    const startTimeStamp = new Date(event.metadata.start_time ?? event.created_at).getTime();
    const endTimeStamp = new Date(event.metadata.end_time ?? event.updated_at).getTime();

    const timeDifferenceMilliseconds = endTimeStamp - startTimeStamp;

    const seconds = Math.floor(timeDifferenceMilliseconds / 1000);
    const weeks = Math.floor(seconds / 604800);
    const remainingDays = Math.floor((seconds % 604800) / 86400);
    const remainingHours = Math.floor((seconds % 86400) / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (weeks > 0) {
        return `${weeks}w ${remainingDays}d`;
    }

    if (remainingDays > 0) {
        return `${remainingDays}d ${remainingHours}h`;
    }

    if (remainingHours > 0) {
        return `${remainingHours}h ${remainingMinutes}m`;
    }

    if (remainingMinutes > 0) {
        return `${remainingMinutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
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