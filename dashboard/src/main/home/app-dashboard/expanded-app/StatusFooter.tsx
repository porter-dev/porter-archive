import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import {
  NewWebsocketOptions,
  useWebsockets,
} from "shared/hooks/useWebsockets";
import {
  getAvailability,
  getAvailabilityStacks,
} from "../../cluster-dashboard/expanded-chart/deploy-status-section/util";
import Spacer from "components/porter/Spacer";
import { timeFormat } from "d3-time-format";
import AnimateHeight, { Height } from "react-animate-height";
import { ControllerTabPodType } from "./status/ControllerTab";
import _ from "lodash";

type Props = {
  chart: any;
  service: any;
};

interface ErrorMessage {
  revision: string;
  message: string;
}

const StatusFooter: React.FC<Props> = ({
  chart,
  service,
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [controller, setController] = React.useState<any>(null);
  const [available, setAvailable] = React.useState<number>(0);
  const [total, setTotal] = React.useState<number>(0);
  const [stale, setStale] = React.useState<number>(0);
  const [unavailable, setUnavailable] = React.useState<number>(0);
  const [height, setHeight] = useState<Height>(0);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [pods, setPods] = useState<ControllerTabPodType[]>([]);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const selectors = useMemo(() => {
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
    return selector;
  }, [controller]);

  useEffect(() => {
    updatePods();
    if (selectors.length > 0) {
      // updatePods();
      [controller?.kind, "pod"].forEach((kind) => {
        setupWebsocket(kind, controller?.metadata?.uid, selectors);
      });
      return () => closeAllWebsockets();
    }
  }, [controller]);

  const getName = (service: any) => {
    const name = chart.name + "-" + service.name;

    switch (service.type) {
      case "web":
        return name + "-web";
      case "worker":
        return name + "-wkr";
      case "job":
        return name + "job";
    }
  };

  useEffect(() => {
    if (chart) {
      api
        .getChartControllers(
          "<token>",
          {},
          {
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            id: currentProject.id,
            name: chart.name,
            revision: chart.version,
          }
        )
        .then((res: any) => {
          const controllers =
            chart.chart.metadata.name == "job"
              ? res.data[0]?.status.active
              : res.data;
          const filteredControllers = controllers.filter((controller: any) => {
            const name = getName(service);
            return name == controller.metadata.name;
          });
          if (filteredControllers.length == 1) {
            setController(filteredControllers[0]);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [chart]);

  const setupWebsocket = (
    kind: string,
    controllerUid: string,
    selectors: string
  ) => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status?`;
    if (kind == "pod" && selectors) {
      apiEndpoint += `selectors=${selectors}`;
    }


    const options: NewWebsocketOptions = {};
    options.onopen = () => {
      if (service.name === "my-web") {
        console.log("opening websocket")
      }
    };

    options.onmessage = async (evt: MessageEvent) => {
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

      if (event.Kind === "deployment") {
        let [available, total, stale, unavailable] = getAvailabilityStacks(object);

        setAvailable(available);
        setTotal(total);
        setStale(stale);
        setUnavailable(unavailable);
        return;
      }
      await updatePods();
    };

    options.onclose = () => {
      if (service.name === "my-web") {
        console.log("closing websocket")
      }
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(kind);
    };

    newWebsocket(kind, apiEndpoint, options);
    openWebsocket(kind);
  };

  const replicaSetArray = useMemo(() => {
    setExpanded(false);
    setHeight(0);
    const podsDividedByReplicaSet = _.sortBy(pods, ["revisionNumber"])
      .reverse()
      .reduce<Array<Array<ControllerTabPodType>>>(function (
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
      },
        []);

    return podsDividedByReplicaSet;
  }, [pods]);

  const percentage = Number(1 - available / total).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
  });

  const formatCreationTimestamp = timeFormat("%H:%M:%S %b %d, '%y");

  const updatePods = async () => {
    try {
      const res = await api.getMatchingPods(
        "<token>",
        {
          namespace: controller?.metadata?.namespace,
          selectors: [selectors],
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
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

          const restartCount = containerStatus
            ? containerStatus.restartCount
            : "N/A";

          const podAge = formatCreationTimestamp(
            new Date(pod?.metadata?.creationTimestamp)
          );

          // console.log(containerStatus)
          const crashLoopReason = containerStatus?.lastState?.terminated?.message ?? "";

          return {
            namespace: pod?.metadata?.namespace,
            name: pod?.metadata?.name,
            phase: pod?.status?.phase,
            status: pod?.status,
            replicaSetName,
            restartCount,
            containerStatus,
            podAge: pod?.metadata?.creationTimestamp ? podAge : "N/A",
            revisionNumber: pod?.metadata?.annotations?.["helm.sh/revision"] || "N/A",
            crashLoopReason,
          };
        });

      setPods(newPods);
    } catch (error) {
      // TODO: handle error
    }
  };

  return (
    <>
      {replicaSetArray != null && replicaSetArray.length > 0 && replicaSetArray.map((replicaSet, i) => {
        return (
          <>
            <StyledStatusFooterTop key={i} expanded={expanded}>
              <StyledContainer row spaced>
                {replicaSet.some(r => r.crashLoopReason != "") ?
                  <>
                    <Running>
                      <StatusDot color="#ff0000" />
                      <Text color="helper">
                        {`${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"} failing to run Revision ${replicaSet[0].revisionNumber}`}
                      </Text>
                    </Running>
                    <Button
                      onClick={() => {
                        expanded ? setHeight(0) : setHeight(122);
                        setExpanded(!expanded);
                      }}
                      height="20px"
                      color="#ffffff11"
                      withBorder
                    >
                      {expanded ? <I className="material-icons">arrow_drop_up</I>
                        : <I className="material-icons">arrow_drop_down</I>}
                      <Text color="helper">
                        See failure reason
                      </Text>
                    </Button>
                  </> :
                  // check if there are more recent replicasets and if the previous replicaset has a crashloop reason
                  i > 0 && !replicaSetArray[i - 1].some(p => p.crashLoopReason != "") ?
                    <Running>
                      <StatusDot color="#FFA500" />
                      <Text color="helper">
                        {`${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"} still running at Revision ${replicaSet[0].revisionNumber}. Spinning down...`}
                      </Text>
                    </Running> :
                    <Running>
                      {replicaSet.length ? <StatusDot /> : <StatusDot color="#ffffff33" />}
                      <Text color="helper">
                        {`${replicaSet.length} replica${replicaSet.length === 1 ? "" : "s"} ${replicaSet.length === 1 ? "is" : "are"} running at Revision ${replicaSet[0].revisionNumber}`}
                      </Text>
                    </Running>
                }
              </StyledContainer>
            </StyledStatusFooterTop>
            {replicaSet.some(r => r.crashLoopReason != "") &&
              <AnimateHeight height={height}>
                <StyledStatusFooter>
                  <Message>
                    {replicaSet.find(r => r.crashLoopReason != "")?.crashLoopReason}
                  </Message>
                </StyledStatusFooter>
              </AnimateHeight>
            }
          </>
        )
      })}
    </>
  );
};


export default StatusFooter;

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${props => props.color || "#38a88a"};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
	transform: scale(1);
	animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }
  
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }
  
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;

const Mi = styled.i`
  font-size: 16px;
  margin-right: 7px;
  margin-top: -1px;
  color: rgb(56, 168, 138);
`;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const StatusCircle = styled.div<{
  percentage?: any;
  dashed?: boolean;
}>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: conic-gradient(
    from 0deg,
    #ffffff33 ${(props) => props.percentage},
    #ffffffaa 0% ${(props) => props.percentage}
  );
  border: ${(props) => (props.dashed ? "1px dashed #ffffff55" : "none")};
`;

const Running = styled.div`
  display: flex;
  align-items: center;
`;

const StyledStatusFooter = styled.div`
  width: 100%;
  padding: 10px 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  flex-direction: row;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledStatusFooterTop = styled(StyledStatusFooter) <{
  expanded: boolean;
}>`
  height: 40px;
  border-bottom: ${({ expanded }) => expanded && "0px"};
  border-bottom-left-radius: ${({ expanded }) => expanded && "0px"};
  border-bottom-right-radius: ${({ expanded }) => expanded && "0px"};
`;

const Message = styled.div`
  padding: 20px;
  background: #000000;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-family: monospace;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
  width: 100%;
  height: 101px;
  overflow: hidden;
`;

const StyledContainer = styled.div<{
  row: boolean;
  spaced: boolean;
}>`
  display: ${props => props.row ? "flex" : "block"};
  align-items: center;
  justify-content: ${props => props.spaced ? "space-between" : "flex-start"};
  width: 100%;
`;