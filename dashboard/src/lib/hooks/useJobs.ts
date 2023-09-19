import _ from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import { useRevisionIdToNumber } from "./useRevisionList";
import { valueExists } from "shared/util";
import { z } from "zod";

const jobRunValidator = z.object({
    metadata: z.object({
        labels: z.object({
            "porter.run/app-revision-id": z.string(),
        }),
        uid: z.string(),
    }),
    status: z.object({
        startTime: z.string().optional(),
        completionTime: z.string().optional(),
        conditions: z.array(z.object({
            lastTransitionTime: z.string(),
        })).default([]),
        succeeded: z.number().optional(),
        failed: z.number().optional(),
    }),
});

const jobEventValidator = z.object({
    event_type: z.string(),
    Object: jobRunValidator,
})

export type JobRun = z.infer<typeof jobRunValidator>;

export const useJobs = (
    {
        projectId,
        clusterId,
        deploymentTargetId,
    }: {
        projectId: number,
        clusterId: number,
        deploymentTargetId: string,
    }
) => {
    const [jobRuns, setJobRuns] = useState<JobRun[]>([]);

    const {
        newWebsocket,
        openWebsocket,
        closeAllWebsockets,
        closeWebsocket,
    } = useWebsockets();

    const setupWebsocket = (
    ) => {
        const websocketKey = `job-runs-for-all-charts-ws-${Math.random().toString(36).substring(2, 15)}`;
        const apiEndpoint = `/api/projects/${projectId}/clusters/${clusterId}/apps/jobs?deployment_target_id=${deploymentTargetId}`;

        const options: NewWebsocketOptions = {};
        options.onopen = () => {
            console.log("opening job websocket " + websocketKey)
        };

        options.onmessage = async (evt: MessageEvent) => {
            const data = await jobEventValidator.parseAsync(JSON.parse(evt.data));
            if (data.event_type === "ADD" || data.event_type === "UPDATE") {
                console.log(data.Object);
                setJobRuns((prev) => [...prev, data.Object]);
            }
        };

        options.onclose = () => {
            console.log("closing job websocket " + websocketKey)
        };

        options.onerror = (err: ErrorEvent) => {
            console.log(err)
            closeWebsocket(websocketKey);
        };

        newWebsocket(websocketKey, apiEndpoint, options);
        openWebsocket(websocketKey);
    };

    useEffect(() => {
        setupWebsocket();
        return () => closeAllWebsockets();
    }, [projectId, clusterId, deploymentTargetId]);


    return {
        jobRuns,
    };
};