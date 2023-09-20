import { JobRun } from "lib/hooks/useJobs";
import { timeFrom } from "shared/string_utils";

export const ranFor = (start: string, end?: string | number) => {
    const duration = timeFrom(start, end);

    const unit =
        duration.time === 1
            ? duration.unitOfTime.substring(0, duration.unitOfTime.length - 1)
            : duration.unitOfTime;

    return `${duration.time} ${unit}`;
};

export const getDuration = (jobRun: JobRun): string => {
    const startTimeStamp = new Date(jobRun.status.startTime ?? jobRun.metadata.creationTimestamp).getTime();

    const endTimeStamp = jobRun.status.completionTime ? new Date(jobRun.status.completionTime).getTime() : Date.now()

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