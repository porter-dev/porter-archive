import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import ResourceTab from "components/ResourceTab";
import ConfirmOverlay from "components/ConfirmOverlay";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import PodRow from "./PodRow";
import { timeFormat } from "d3-time-format";

type Props = {
  controller: any;
  selectedPod: any;
  selectPod: (newPod: any) => unknown;
  selectors: any;
  isLast?: boolean;
  isFirst?: boolean;
  setPodError: (x: string) => void;
};

// Controller tab in log section that displays list of pods on click.
export type ControllerTabPodType = {
  namespace: string;
  name: string;
  phase: string;
  status: any;
  replicaSetName: string;
  restartCount: number | string;
  podAge: string;
  revisionNumber?: number;
  containerStatus: any;
};

const formatCreationTimestamp = timeFormat("%H:%M:%S %b %d, '%y");

const ControllerTabFC: React.FunctionComponent<Props> = ({
  controller,
  selectPod,
  isFirst,
  isLast,
  selectors,
  setPodError,
  selectedPod,
}) => {
  const [pods, setPods] = useState<ControllerTabPodType[]>([]);
  const [rawPodList, setRawPodList] = useState<any[]>([]);
  const [podPendingDelete, setPodPendingDelete] = useState<any>(null);
  const [available, setAvailable] = useState<number>(null);
  const [total, setTotal] = useState<number>(null);
  const [userSelectedPod, setUserSelectedPod] = useState<boolean>(false);

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );
  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const currentSelectors = useMemo(() => {
    if (controller.kind.toLowerCase() == "job" && selectors) {
      return [...selectors];
    }
    let newSelectors = [] as string[];
    let ml =
      controller?.spec?.selector?.matchLabels || controller?.spec?.selector;
    let i = 1;
    let selector = "";
    for (var key in ml) {
      selector += key + "=" + ml[key];
      if (i != Object.keys(ml).length) {
        selector += ",";
      }
      i += 1;
    }
    newSelectors.push(selector);
    return [...newSelectors];
  }, [controller, selectors]);

  useEffect(() => {
    updatePods();
    [controller?.kind, "pod"].forEach((kind) => {
      setupWebsocket(kind, controller?.metadata?.uid);
    });
    () => closeAllWebsockets();
  }, [currentSelectors, controller, currentCluster, currentProject]);

  const updatePods = async () => {
    try {
      const res = await api.getMatchingPods(
        "<token>",
        {
          namespace: controller?.metadata?.namespace,
          selectors: currentSelectors,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      const data = res?.data as any[];
      let newPods = data
        // Parse only data that we need
        .map<ControllerTabPodType>((pod: any) => {
          const replicaSetName =
            Array.isArray(pod?.metadata?.ownerReferences) &&
            pod?.metadata?.ownerReferences[0]?.name;
          const containerStatus =
            Array.isArray(pod?.status?.containerStatuses) &&
            pod?.status?.containerStatuses[0];

          const restartCount = containerStatus
            ? containerStatus.restartCount
            : "N/A";

          const podAge = formatCreationTimestamp(
            new Date(pod?.metadata?.creationTimestamp)
          );

          return {
            namespace: pod?.metadata?.namespace,
            name: pod?.metadata?.name,
            phase: pod?.status?.phase,
            status: pod?.status,
            replicaSetName,
            restartCount,
            containerStatus,
            podAge: pod?.metadata?.creationTimestamp ? podAge : "N/A",
            revisionNumber:
              (pod?.metadata?.annotations &&
                pod?.metadata?.annotations["helm.sh/revision"]) ||
              "N/A",
          };
        });

      setPods(newPods);
      setRawPodList(data);
      // If the user didn't click a pod, select the first returned from list.
      if (!userSelectedPod) {
        let status = getPodStatus(newPods[0].status);
        status === "failed" &&
          newPods[0].status?.message &&
          setPodError(newPods[0].status?.message);
        handleSelectPod(newPods[0], data);
      }
    } catch (error) {}
  };

  /**
   * handleSelectPod is a wrapper for the selectPod function received from parent.
   * Internally we use the ControllerPodType but we want to pass to the parent the
   * raw pod returned from the API.
   *
   * @param pod A ControllerPodType pod that will be used to search the raw pod to pass
   * @param rawList A rawList of pods in case we don't want to use the state one. Useful to
   * avoid problems with reactivity
   */
  const handleSelectPod = (pod: ControllerTabPodType, rawList?: any[]) => {
    const rawPod = [...rawPodList, ...(rawList || [])].find(
      (rawPod) => rawPod?.metadata?.name === pod?.name
    );
    selectPod(rawPod);
  };

  const currentSelectedPod = useMemo(() => {
    const pod = selectedPod;
    const replicaSetName =
      Array.isArray(pod?.metadata?.ownerReferences) &&
      pod?.metadata?.ownerReferences[0]?.name;
    return {
      namespace: pod?.metadata?.namespace,
      name: pod?.metadata?.name,
      phase: pod?.status?.phase,
      status: pod?.status,
      replicaSetName,
    } as ControllerTabPodType;
  }, [selectedPod]);

  const currentControllerStatus = useMemo(() => {
    let status = available == total ? "running" : "waiting";

    controller?.status?.conditions?.forEach((condition: any) => {
      if (
        condition.type == "Progressing" &&
        condition.status == "False" &&
        condition.reason == "ProgressDeadlineExceeded"
      ) {
        status = "failed";
      }
    });

    if (controller.kind.toLowerCase() === "job" && pods.length == 0) {
      status = "completed";
    }
    return status;
  }, [controller, available, total, pods]);

  const getPodStatus = (status: any) => {
    if (
      status?.phase === "Pending" &&
      status?.containerStatuses !== undefined
    ) {
      return status.containerStatuses[0].state?.waiting?.reason || "Pending";
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
            s.state?.waiting?.reason === "CrashLoopBackOff"
              ? "failed"
              : "waiting";
        } else if (s.state?.terminated) {
          collatedStatus = "failed";
        }
      });
      return collatedStatus;
    }
  };

  const handleDeletePod = (pod: any) => {
    api
      .deletePod(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          name: pod?.name,
          namespace: pod?.namespace,
          id: currentProject.id,
        }
      )
      .then((res) => {
        updatePods();
        setPodPendingDelete(null);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        setPodPendingDelete(null);
      });
  };

  const replicaSetArray = useMemo(() => {
    const podsDividedByReplicaSet = pods.reduce<
      Array<Array<ControllerTabPodType>>
    >(function (prev, currentPod, i) {
      if (
        !i ||
        prev[prev.length - 1][0].replicaSetName !== currentPod.replicaSetName
      ) {
        return prev.concat([[currentPod]]);
      }
      prev[prev.length - 1].push(currentPod);
      return prev;
    }, []);

    if (podsDividedByReplicaSet.length === 1) {
      return [];
    } else {
      return podsDividedByReplicaSet;
    }
  }, [pods]);

  const getAvailability = (kind: string, c: any) => {
    switch (kind?.toLowerCase()) {
      case "deployment":
      case "replicaset":
        return [
          c.status?.availableReplicas ||
            c.status?.replicas - c.status?.unavailableReplicas ||
            0,
          c.status?.replicas || 0,
        ];
      case "statefulset":
        return [c.status?.readyReplicas || 0, c.status?.replicas || 0];
      case "daemonset":
        return [
          c.status?.numberAvailable || 0,
          c.status?.desiredNumberScheduled || 0,
        ];
      case "job":
        return [1, 1];
    }
  };

  const setupWebsocket = (kind: string, controllerUid: string) => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;
    if (kind == "pod" && currentSelectors) {
      apiEndpoint += `selectors=${currentSelectors[0]}`;
    }

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
        let [available, total] = getAvailability(object.metadata.kind, object);
        setAvailable(available);
        setTotal(total);
        return;
      }
      updatePods();
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

  const mapPods = (podList: ControllerTabPodType[]) => {
    return podList.map((pod, i, arr) => {
      let status = getPodStatus(pod.status);
      return (
        <PodRow
          key={i}
          pod={pod}
          isSelected={currentSelectedPod?.name === pod?.name}
          podStatus={status}
          isLastItem={i === arr.length - 1}
          onTabClick={() => {
            setPodError("");
            status === "failed" &&
              pod.status?.message &&
              setPodError(pod.status?.message);
            handleSelectPod(pod);
            setUserSelectedPod(true);
          }}
          onDeleteClick={() => setPodPendingDelete(pod)}
        />
      );
    });
  };

  return (
    <ResourceTab
      label={controller.kind}
      // handle CronJob case
      name={controller.metadata?.name || controller.name}
      status={{ label: currentControllerStatus, available, total }}
      isLast={isLast}
      expanded={isFirst}
    >
      {!!replicaSetArray.length &&
        replicaSetArray.map((subArray, index) => {
          const firstItem = subArray[0];
          return (
            <div key={firstItem.replicaSetName + index}>
              <ReplicaSetContainer>
                <ReplicaSetName>
                  {firstItem?.revisionNumber &&
                    firstItem?.revisionNumber.toString() != "N/A" && (
                      <Bold>Revision {firstItem.revisionNumber}:</Bold>
                    )}{" "}
                  {firstItem.replicaSetName}
                </ReplicaSetName>
              </ReplicaSetContainer>
              {mapPods(subArray)}
            </div>
          );
        })}
      {!replicaSetArray.length && mapPods(pods)}
      <ConfirmOverlay
        message="Are you sure you want to delete this pod?"
        show={podPendingDelete}
        onYes={() => handleDeletePod(podPendingDelete)}
        onNo={() => setPodPendingDelete(null)}
      />
    </ResourceTab>
  );
};

export default ControllerTabFC;

const Bold = styled.span`
  font-weight: 500;
  display: inline;
  color: #ffffff;
`;

const RevisionLabel = styled.div`
  font-size: 12px;
  color: #ffffff33;
  width: 78px;
  text-align: right;
  padding-top: 7px;
  margin-right: 10px;
  margin-left: 10px;
  overflow-wrap: anywhere;
`;

const ReplicaSetContainer = styled.div`
  padding: 10px 5px;
  display: flex;
  overflow-wrap: anywhere;
  justify-content: space-between;
  border-top: 2px solid #ffffff11;
`;

const ReplicaSetName = styled.span`
  padding-left: 10px;
  overflow-wrap: anywhere;
  max-width: calc(100% - 45px);
  line-height: 1.5em;
  color: #ffffff33;
`;
