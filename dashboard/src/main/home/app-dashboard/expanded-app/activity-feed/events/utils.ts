import { PorterAppEvent } from "shared/types";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.png";
import loading from "assets/loading.gif";

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
        formattedTime += `${hours} h `;
    }

    if (minutes > 0) {
        formattedTime += `${minutes} m `;
    }

    if (hours === 0 && minutes === 0) {
        formattedTime += `${remainingSeconds} s`;
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