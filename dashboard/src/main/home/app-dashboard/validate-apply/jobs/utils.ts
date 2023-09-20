import { JobRun } from "lib/hooks/useJobs";
import { timeFrom } from "shared/string_utils";
import { differenceInSeconds, formatDuration } from 'date-fns';

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

    return formatDuration({ seconds: timeDifferenceInSeconds });
};