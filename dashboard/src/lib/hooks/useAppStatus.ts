import { ControllerTabPodType } from "main/home/app-dashboard/expanded-app/status/ControllerTab";
import { useEffect, useState } from "react";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";

export const useAppStatus = (
    {
        projectId,
        clusterId,
        serviceNames,
        deploymentTargetId,
        kind = "pod",
    }: {
        projectId: number,
        clusterId: number,
        serviceNames: string[],
        deploymentTargetId: string,
        kind?: string,
    }
) => {
    const [pods, setPods] = useState<ControllerTabPodType[]>([]);

    const {
        newWebsocket,
        openWebsocket,
        closeAllWebsockets,
        getWebsocket,
        closeWebsocket,
    } = useWebsockets();

    const setupWebsocket = (
        serviceName: string,
    ) => {
        const selectors = `porter.run/service-name=${serviceName},porter.run/deployment-target-id=${deploymentTargetId}`;
        const apiEndpoint = `/api/projects/${projectId}/clusters/${clusterId}/apps/${kind}/status?selectors=${selectors}`;

        const options: NewWebsocketOptions = {};
        options.onopen = () => {
            console.log("opening status websocket")
        };

        options.onmessage = async (evt: MessageEvent) => {
            let event = JSON.parse(evt.data);
            let object = event.Object;
            object.metadata.kind = event.Kind;

            console.log("event", event);
            console.log("object", object);

            // Make a new API call to update pods only when the event type is UPDATE
            if (event.event_type !== "UPDATE") {
                return;
            }
            // update pods no matter what if ws message is a pod event.
            // If controller event, check if ws message corresponds to the designated controller in props.
            // if (event.Kind != "pod" && object.metadata.uid !== controllerUid) {
            //     return;
            // }

            // if (event.Kind === "deployment") {
            //     let [available, total, stale, unavailable] = getAvailabilityStacks(
            //         object
            //     );

            //     setAvailable(available);
            //     setTotal(total);
            //     setStale(stale);
            //     setUnavailable(unavailable);
            //     return;
            // }
            // await updatePods();
        };

        options.onclose = () => { };

        options.onerror = (err: ErrorEvent) => {
            console.log(err);
            closeWebsocket(kind);
        };

        newWebsocket(kind, apiEndpoint, options);
        openWebsocket(kind);
    };

    useEffect(() => {
        for (let serviceName of serviceNames) {
            setupWebsocket(serviceName);
        }
        return () => closeAllWebsockets();
    }, [projectId, clusterId, serviceNames, deploymentTargetId]);


    // useEffect(() => {
    //     updatePods();
    //     if (selectors.length > 0) {
    //         // updatePods();
    //         [controller?.kind, "pod"].forEach((kind) => {
    //             setupWebsocket(kind, controller?.metadata?.uid, selectors);
    //         });
    //         return () => closeAllWebsockets();
    //     }
    // }, [controller]);

    // const replicaSetArray = useMemo(() => {
    //     setExpanded(false);
    //     setHeight(0);
    //     const podsDividedByReplicaSet = _.sortBy(pods, ["revisionNumber"])
    //         .reverse()
    //         .reduce<Array<Array<ControllerTabPodType>>>(function (
    //             prev,
    //             currentPod,
    //             i
    //         ) {
    //             if (
    //                 !i ||
    //                 prev[prev.length - 1][0].replicaSetName !== currentPod.replicaSetName
    //             ) {
    //                 return prev.concat([[currentPod]]);
    //             }
    //             prev[prev.length - 1].push(currentPod);
    //             return prev;
    //         },
    //             []);

    //     return podsDividedByReplicaSet;
    // }, [pods]);
    const replicaSetArray = {};

    return {
        replicaSetArray,
    };
};