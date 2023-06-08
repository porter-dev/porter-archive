import { PorterAppEvent } from "shared/types";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.png";
import loading from "assets/loading.gif";
import api from "shared/api";

export const getDuration = (event: PorterAppEvent): string => {
    const startTimeStamp = new Date(event.created_at).getTime();
    const endTimeStamp = new Date(event.updated_at).getTime();

    const timeDifferenceMilliseconds = endTimeStamp - startTimeStamp;

    const seconds = Math.floor(timeDifferenceMilliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedTime = "";

    if (hours > 0) {
        formattedTime += `${hours}h `;
    }

    if (minutes > 0) {
        formattedTime += `${minutes}m `;
    }

    if (hours === 0 && minutes === 0) {
        formattedTime += `${remainingSeconds}s`;
    }

    return formattedTime.trim();
};

export const getStatusIcon = (status: string) => {
    switch (status) {
        case "SUCCESS":
            return healthy;
        case "FAILED":
            return failure;
        case "PROGRESSING":
            return loading;
        default:
            return loading;
    }
};

export const triggerWorkflow = async (appData: any) => {
    try {
        const res = await api.reRunGHWorkflow(
            "",
            {},
            {
                project_id: appData.app.project_id,
                cluster_id: appData.app.cluster_id,
                git_installation_id: appData.app.git_repo_id,
                owner: appData.app.repo_name?.split("/")[0],
                name: appData.app.repo_name?.split("/")[1],
                branch: appData.app.branch_name,
                filename: "porter_stack_" + appData.chart.name + ".yml",
            }
        );
        if (res.data != null) {
            window.open(res.data, "_blank", "noreferrer");
        }
    } catch (error) {
        console.log(error);
    }
};