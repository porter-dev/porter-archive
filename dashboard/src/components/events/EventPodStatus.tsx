import { timeFormat } from "d3-time-format";
import { ControllerTabPodType } from "main/home/cluster-dashboard/expanded-chart/status/ControllerTab";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";

const formatCreationTimestamp = timeFormat("%H:%M:%S %b %d, '%y");

const EventPodStatus: React.FC<{ controller: any; podName: string }> = ({
  podName,
}) => {
  const [status, setCurrentStatus] = useState(null);
  const { currentProject, currentCluster } = useContext(Context);
  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();

  const setupWebsocket = (kind: string, controllerUid: string) => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;

    apiEndpoint += `selectors=metadata.name=${podName}`;

    const options: NewWebsocketOptions = {};
    options.onopen = () => {
      console.log("connected to websocket");
    };

    options.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let object = event.Object;
      object.metadata.kind = event.Kind;

      // Make a new API call to update pods only when the event type is UPDATE
      if (event.event_type !== "UPDATE") {
        return;
      }
      // update pods no matter what if ws message is a pod event.
      // If controller event, check if ws message corresponds to the designated controller in props.
      if (event.Kind != "pod" && object.metadata.uid !== controllerUid) {
        return;
      }

      if (event.Kind != "pod") {
        return;
      }
      // updatePods();
    };

    options.onclose = () => {
      console.log("closing websocket");
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(kind);
    };

    newWebsocket(kind, apiEndpoint, options);
    openWebsocket(kind);
  };

  const getPodStatus = (status: any) => {
    if (
      status?.phase === "Pending" &&
      status?.containerStatuses !== undefined
    ) {
      return status.containerStatuses[0].state.waiting.reason;
    } else if (status?.phase === "Pending") {
      return "Pending";
    }

    if (status?.phase === "Failed") {
      return "failed";
    }

    if (status?.phase === "Running") {
      let collatedStatus = "running";

      status?.containerStatuses?.forEach((s: any) => {
        if (s.state?.waiting) {
          collatedStatus =
            s.state?.waiting.reason === "CrashLoopBackOff"
              ? "failed"
              : "waiting";
        } else if (s.state?.terminated) {
          collatedStatus = "failed";
        }
      });
      return collatedStatus;
    }
  };

  const updatePods = async () => {
    try {
      const res = await api.getMatchingPods(
        "<token>",
        {
          namespace: "default",
          selectors: ["metada.name" + podName],
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      console.log(res.data);
      // const data = res?.data as any[];
      // let newPods = data
      //   // Parse only data that we need
      //   .map<ControllerTabPodType>((pod: any) => {
      //     const replicaSetName =
      //       Array.isArray(pod?.metadata?.ownerReferences) &&
      //       pod?.metadata?.ownerReferences[0]?.name;
      //     const containerStatus =
      //       Array.isArray(pod?.status?.containerStatuses) &&
      //       pod?.status?.containerStatuses[0];

      //     const restartCount = containerStatus
      //       ? containerStatus.restartCount
      //       : "N/A";

      //     const podAge = formatCreationTimestamp(
      //       new Date(pod?.metadata?.creationTimestamp)
      //     );

      //     return {
      //       namespace: pod?.metadata?.namespace,
      //       name: pod?.metadata?.name,
      //       phase: pod?.status?.phase,
      //       status: pod?.status,
      //       replicaSetName,
      //       restartCount,
      //       podAge: pod?.metadata?.creationTimestamp ? podAge : "N/A",
      //       revisionNumber:
      //         (pod?.metadata?.annotations &&
      //           pod?.metadata?.annotations["helm.sh/revision"]) ||
      //         "N/A",
      //     };
      //   });

      // setPods(newPods);
      // setRawPodList(data);
      // // If the user didn't click a pod, select the first returned from list.
      // if (!userSelectedPod) {
      //   let status = getPodStatus(newPods[0].status);
      //   status === "failed" &&
      //     newPods[0].status?.message &&
      //     setPodError(newPods[0].status?.message);
      //   handleSelectPod(newPods[0], data);
      // }
    } catch (error) {}
  };

  useEffect(() => {
    updatePods();
  }, [podName]);

  return <div></div>;
};

export default EventPodStatus;
