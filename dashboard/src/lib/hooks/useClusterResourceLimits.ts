import { AWS_INSTANCE_LIMITS } from "main/home/app-dashboard/validate-apply/services-settings/tabs/utils";
import { useEffect, useState } from "react";
import convert from "convert";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import api from "shared/api";

const clusterDataValidator = z.object({
    labels: z.object({
        "beta.kubernetes.io/instance-type": z.string().nullish(),
    }).optional(),
}).transform((data) => {
    const defaultResources = {
        maxCPU: AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"],
        maxRAM: AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"],
    };
    if (!data.labels) {
        return defaultResources;
    }
    const instanceType = data.labels["beta.kubernetes.io/instance-type"];
    if (!instanceType) {
        return defaultResources;
    }
    const splits = instanceType.split(".");
    if (splits.length !== 2) {
        return defaultResources;
    }
    const [instanceClass, instanceSize] = splits;
    if (AWS_INSTANCE_LIMITS[instanceClass] && AWS_INSTANCE_LIMITS[instanceClass][instanceSize]) {
        const { vCPU, RAM } = AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
        return {
            maxCPU: vCPU,
            maxRAM: RAM,
        };
    }
    return defaultResources;
});
export const useClusterResourceLimits = (
    {
        projectId,
        clusterId,
    }: {
        projectId: number | undefined,
        clusterId: number | undefined,
    }
) => {
    const UPPER_BOUND = 0.75;

    const [maxCPU, setMaxCPU] = useState(
        AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"] * UPPER_BOUND
    ); //default is set to a t3 medium
    const [maxRAM, setMaxRAM] = useState(
        // round to 100
        Math.round(
            convert(AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"], "GiB").to("MB") *
            UPPER_BOUND / 100
        ) * 100
    ); //default is set to a t3 medium

    const { data } = useQuery(
        ["getClusterNodes", projectId, clusterId],
        async () => {
            if (!projectId || !clusterId) {
                return Promise.resolve([]);
            }

            const res = await api.getClusterNodes(
                "<token>",
                {},
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                }
            )

            return await z.array(clusterDataValidator).parseAsync(res.data);
        },
        {
            enabled: !!projectId && !!clusterId,
            refetchOnWindowFocus: false,
        }
    );

    useEffect(() => {
        if (data) {
            // this logic handles CPU and RAM independently - we might want to change this later
            const maxCPU = data.reduce((acc, curr) => {
                return Math.max(acc, curr.maxCPU);
            }, 0);
            const maxRAM = data.reduce((acc, curr) => {
                return Math.max(acc, curr.maxRAM);
            }, 0);
            // if the instance type has more than 4 GB ram, we use 90% of the ram/cpu
            // otherwise, we use 75%
            if (maxRAM > 4) {
                // round down to nearest 0.5 cores
                setMaxCPU(Math.floor(maxCPU * 0.9 * 2) / 2);
                setMaxRAM(
                    Math.round(
                        convert(maxRAM, "GiB").to("MB") * 0.9 / 100
                    ) * 100
                );
            } else {
                setMaxCPU(Math.floor(maxCPU * UPPER_BOUND * 2) / 2);
                setMaxRAM(
                    Math.round(
                        convert(maxRAM, "GiB").to("MB") * UPPER_BOUND / 100
                    ) * 100
                );
            }
        }
    }, [data])


    return {
        maxCPU,
        maxRAM
    }
}