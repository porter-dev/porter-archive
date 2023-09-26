import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import { useRevisionList } from "./useRevisionList";
import { valueExists } from "shared/util";

export type PorterAppVersionStatus = {
    status: 'running' | 'spinningDown' | 'failing';
    message: string;
    crashLoopReason: string;
}

type ClientPod = {
    revisionId: string,
    helmRevision: string,
    crashLoopReason: string,
    isFailing: boolean,
    replicaSetName: string,
}

export const useAppStatus = (
    {
        projectId,
        clusterId,
        serviceNames,
        deploymentTargetId,
        appName,
        kind = "pod",
    }: {
        projectId: number,
        clusterId: number,
        serviceNames: string[],
        deploymentTargetId: string,
        appName: string,
        kind?: string,
    }
) => {
    const [servicePodMap, setServicePodMap] = useState<Record<string, ClientPod[]>>({});

    const { revisionIdToNumber } = useRevisionList({ appName, deploymentTargetId, projectId, clusterId });

    const {
        newWebsocket,
        openWebsocket,
        closeAllWebsockets,
        closeWebsocket,
    } = useWebsockets();

    const setupWebsocket = (
        serviceName: string,
    ) => {
        const selectors = `porter.run/service-name=${serviceName},porter.run/deployment-target-id=${deploymentTargetId}`;
        const apiEndpoint = `/api/projects/${projectId}/clusters/${clusterId}/apps/${kind}/status?selectors=${selectors}`;
        const websocketKey = `${serviceName}-${Math.random().toString(36).substring(2, 15)}`

        const options: NewWebsocketOptions = {};
        options.onopen = () => {
            // console.log("opening status websocket for service: " + serviceName)
        };

        options.onmessage = async (evt: MessageEvent) => {
            await updatePods(serviceName);
        };

        options.onclose = () => {
            // console.log("closing status websocket for service: " + serviceName)
        };

        options.onerror = (err: ErrorEvent) => {
            closeWebsocket(websocketKey);
        };

        newWebsocket(websocketKey, apiEndpoint, options);
        openWebsocket(websocketKey);
    };

    const updatePods = async (serviceName: string) => {
        try {
            const res = await api.appPodStatus(
                "<token>",
                {
                    deployment_target_id: deploymentTargetId,
                    service: serviceName,
                },
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                    app_name: appName,
                }
            );
            // TODO: type the response
            const data = res?.data as any[];
            let newPods = data
                // Parse only data that we need
                .map((pod: any) => {
                    const replicaSetName =
                        Array.isArray(pod?.metadata?.ownerReferences) &&
                        pod?.metadata?.ownerReferences[0]?.name;
                    const containerStatus =
                        Array.isArray(pod?.status?.containerStatuses) &&
                        pod?.status?.containerStatuses[0];

                    // const restartCount = containerStatus
                    //     ? containerStatus.restartCount
                    //     : "N/A";

                    // const podAge = timeFormat("%H:%M:%S %b %d, '%y")(
                    //     new Date(pod?.metadata?.creationTimestamp)
                    // );

                    const isFailing = containerStatus?.state?.waiting?.reason === "CrashLoopBackOff" ?? false;
                    const crashLoopReason = containerStatus?.lastState?.terminated?.message ?? "";

                    return {
                        // namespace: pod?.metadata?.namespace,
                        // name: pod?.metadata?.name,
                        // phase: pod?.status?.phase,
                        // status: pod?.status,
                        // restartCount,
                        // containerStatus,
                        // podAge: pod?.metadata?.creationTimestamp ? podAge : "N/A",
                        replicaSetName,
                        revisionId: pod?.metadata?.labels?.["porter.run/app-revision-id"],
                        helmRevision: pod?.metadata?.annotations?.["helm.sh/revision"] || "N/A",
                        crashLoopReason,
                        isFailing
                    };
                });
            setServicePodMap((prevState) => ({
                ...prevState,
                [serviceName]: newPods,
            }));
        } catch (error) {
            // TODO: handle error
        }
    };

    useEffect(() => {
        Promise.all(serviceNames.map(updatePods));
        for (let serviceName of serviceNames) {
            setupWebsocket(serviceName);
        }
        return () => closeAllWebsockets();
    }, [projectId, clusterId, deploymentTargetId, appName]);

    const processReplicaSetArray = (replicaSetArray: ClientPod[][]): PorterAppVersionStatus[] => {
        return replicaSetArray.map((replicaSet, i) => {
            let status: 'running' | 'failing' | 'spinningDown' = "running";
            let message = "";

            const version = revisionIdToNumber[replicaSet[0].revisionId];

            if (!version) {
                return undefined;
            }

            if (replicaSet.some((r) => r.crashLoopReason !== "") || replicaSet.some((r) => r.isFailing)) {
                status = "failing";
                message = `${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"
                    } failing to run Version ${version}`;
            } else if (
                // last check ensures that we don't say 'spinning down' unless there exists a version status above it
                i > 0 && replicaSetArray[i - 1].every(p => !p.isFailing) && revisionIdToNumber[replicaSetArray[i - 1][0].revisionId] != null
            ) {
                status = "spinningDown";
                message = `${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"
                    } still running at Version ${version}. Attempting to spin down...`;
            } else {
                status = "running";
                message = `${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"
                    } running at Version ${version}`;
            }

            const crashLoopReason =
                replicaSet.find((r) => r.crashLoopReason !== "")?.crashLoopReason || "";

            return {
                status,
                message,
                crashLoopReason,
            };
        }).filter(valueExists);
    }

    const serviceVersionStatus: Record<string, PorterAppVersionStatus[]> = useMemo(() => {
        const serviceReplicaSetMap = Object.fromEntries(Object.keys(servicePodMap).map((serviceName) => {
            const pods = servicePodMap[serviceName];
            const replicaSetMap = _.sortBy(pods, ["helmRevision"])
                .reverse()
                .reduce<ClientPod[][]>(function (
                    prev,
                    currentPod,
                    i
                ) {
                    if (
                        !i ||
                        prev[prev.length - 1][0].replicaSetName !== currentPod.replicaSetName
                    ) {
                        return prev.concat([[currentPod]]);
                    }
                    prev[prev.length - 1].push(currentPod);
                    return prev;
                }, []);

            return [serviceName, processReplicaSetArray(replicaSetMap)];
        }));

        return serviceReplicaSetMap;
    }, [JSON.stringify(servicePodMap), JSON.stringify(revisionIdToNumber)]);

    return {
        serviceVersionStatus,
    };
};