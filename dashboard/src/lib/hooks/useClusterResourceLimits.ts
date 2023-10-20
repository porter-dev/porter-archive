import { AWS_INSTANCE_LIMITS } from "main/home/app-dashboard/validate-apply/services-settings/tabs/utils";
import { useEffect, useState } from "react";
import convert from "convert";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import api from "shared/api";

const clusterDataValidator = z.object({
    labels: z.object({
        "beta.kubernetes.io/instance-type": z.string().nullish(),
        "porter.run/workload-kind": z.string().nullish(),
    }).optional(),
}).transform((data) => {
    const defaultResources = {
        maxCPU: AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"],
        maxRAM: AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"],
        instanceType: "t3.medium",
    };
    if (!data.labels) {
        return defaultResources;
    }
    const workloadKind = data.labels["porter.run/workload-kind"];
    if (!workloadKind || workloadKind !== "application") {
        return defaultResources;
    }
    const instanceType = data.labels["beta.kubernetes.io/instance-type"];
    const res = z.tuple([z.string(), z.string()]).safeParse(instanceType?.split("."))
    if (!res.success) {
        return defaultResources;
    }
    const [instanceClass, instanceSize] = res.data;
    if (AWS_INSTANCE_LIMITS[instanceClass] && AWS_INSTANCE_LIMITS[instanceClass][instanceSize]) {
        const { vCPU, RAM } = AWS_INSTANCE_LIMITS[instanceClass][instanceSize];
        return {
            maxCPU: vCPU,
            maxRAM: RAM,
            instanceType: "g4dn.xlarge",
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
): {
    maxCPU: number,
    maxRAM: number,
    // defaults indicate the resources assigned to new services
    defaultCPU: number,
    defaultRAM: number,
    gpuNodes: boolean,
} => {
    const SMALL_INSTANCE_UPPER_BOUND = 0.75;
    const LARGE_INSTANCE_UPPER_BOUND = 0.9;
    const DEFAULT_MULTIPLIER = 0.125;
    const [gpuNodes, setGpuNodes] = useState(false);
    const [maxCPU, setMaxCPU] = useState(
        AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"] * SMALL_INSTANCE_UPPER_BOUND
    ); //default is set to a t3 medium
    const [maxRAM, setMaxRAM] = useState(
        // round to nearest 100
        Math.round(
            convert(AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"], "GiB").to("MB") *
            SMALL_INSTANCE_UPPER_BOUND / 100
        ) * 100
    ); //default is set to a t3 medium
    const [defaultCPU, setDefaultCPU] = useState(
        AWS_INSTANCE_LIMITS["t3"]["medium"]["vCPU"] * DEFAULT_MULTIPLIER
    ); //default is set to a t3 medium
    const [defaultRAM, setDefaultRAM] = useState(
        // round to nearest 100
        Math.round(
            convert(AWS_INSTANCE_LIMITS["t3"]["medium"]["RAM"], "GiB").to("MB") *
            DEFAULT_MULTIPLIER / 100
        ) * 100
    ); //default is set to a t3 medium

    const { data } = useQuery(
        ["getClusterNodes", projectId, clusterId],
        async () => {
            if (!projectId || !clusterId || clusterId === -1) {
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
            retry: false,
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
            let maxMultiplier = SMALL_INSTANCE_UPPER_BOUND;
            // if the instance type has more than 4 GB ram, we use 90% of the ram/cpu
            // otherwise, we use 75%
            if (maxRAM > 4) {
                maxMultiplier = LARGE_INSTANCE_UPPER_BOUND;
            }
            // round down to nearest 0.5 cores
            const newMaxCPU = Math.floor(maxCPU * maxMultiplier * 2) / 2;
            // round down to nearest 100 MB
            const newMaxRAM = Math.round(
                convert(maxRAM, "GiB").to("MB") * maxMultiplier / 100
            ) * 100;
            setMaxCPU(newMaxCPU);
            setMaxRAM(newMaxRAM);
            setDefaultCPU(Number((newMaxCPU * DEFAULT_MULTIPLIER).toFixed(2)));
            setDefaultRAM(Number((newMaxRAM * DEFAULT_MULTIPLIER).toFixed(0)));

            // Check if any instance type has "gd4n" and update gpuNodes accordingly
            setGpuNodes(data.some(item => 
                item.instanceType.includes("g4dn")
            ));
        }
    }, [data])


    return {
        maxCPU,
        maxRAM,
        defaultCPU,
        defaultRAM,
        gpuNodes,
    }
}

// this function returns the fraction which the resource sliders 'snap' to when the user turns on smart optimization
export const lowestClosestResourceMultipler = (min: number, max: number, value: number): number => {
    const fractions = [0.5, 0.25, 0.125];

    for (const fraction of fractions) {
        const newValue = fraction * (max - min) + min;
        if (newValue <= value) {
            return fraction;
        }
    }

    return 0.125; // Return 0 if no fraction rounds down
}

// this function is used to snap both resource sliders in unison when one is changed
export const closestMultiplier = (min: number, max: number, value: number): number => {
    const fractions = [0.5, 0.25, 0.125];
    let closestFraction = 0.125;
    for (const fraction of fractions) {
        const newValue = fraction * (max - min) + min;
        if (Math.abs(newValue - value) < Math.abs(closestFraction * (max - min) + min - value)) {
            closestFraction = fraction;
        }
    }

    return closestFraction;
}