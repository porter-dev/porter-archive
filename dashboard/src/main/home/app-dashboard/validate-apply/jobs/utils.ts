import { type JobRun } from "lib/hooks/useJobs";
import { timeFrom } from "shared/string_utils";
import { differenceInSeconds, intervalToDuration } from 'date-fns';
import api from "shared/api";
import {z} from "zod";

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

    const timeDifferenceInSeconds = differenceInSeconds(endTimeStamp, startTimeStamp);
    const duration = intervalToDuration({ start: 0, end: timeDifferenceInSeconds * 1000 });
    if (duration.weeks) {
        return `${duration.weeks}w ${duration.days}d ${duration.hours}h`
    } else if (duration.days) {
        return `${duration.days}d ${duration.hours}h ${duration.minutes}m`
    } else if (duration.hours) {
        return `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`
    } else if (duration.minutes) {
        return `${duration.minutes}m ${duration.seconds}s`
    } else {
        return `${duration.seconds}s`
    }
};