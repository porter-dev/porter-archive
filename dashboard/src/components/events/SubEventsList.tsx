import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import api from "shared/api";
import { Context } from "shared/Context";
import SubEventCard from "./sub-events/SubEventCard";
import Loading from "components/Loading";
import LogBucketCard from "./sub-events/LogBucketCard";
import useLastSeenPodStatus from "./useLastSeenPodStatus";

const getReadableDate = (s: number) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${date}`;
};

const SubEventsList: React.FC<{
  clearSelectedEvent: () => void;
  event: any;
}> = ({ event, clearSelectedEvent }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const {
    status,
    hasError: hasPodStatusErrored,
    isLoading: isPodStatusLoading,
  } = useLastSeenPodStatus({
    podName: event.name,
    namespace: event.namespace,
    resource_type: event.resource_type,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [subEvents, setSubEvents] = useState(null);

  const getData = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    const kube_event_id = event?.id;
    let updatedEvent: any = null;
    try {
      updatedEvent = await api
        .getKubeEvent("<token>", {}, { project_id, cluster_id, kube_event_id })
        .then((res) => res?.data);
    } catch (error) {
      console.error(error);
    }

    let logBucketsParsed = [];
    try {
      const logBucketsData = await api
        .getLogBuckets("token", {}, { project_id, cluster_id, kube_event_id })
        .then((res) => res?.data);

      logBucketsParsed = logBucketsData.log_buckets.map((bucket: string) => {
        const [
          _resourceType,
          _namespace,
          resource_name,
          timestamp,
        ] = bucket.split(":");
        return {
          event_type: "log_bucket",
          resource_name,
          timestamp: new Date(Number(timestamp) * 1000).toUTCString(),
          parent_id: updatedEvent?.id,
        };
      });
    } catch (error) {
      console.error(error);
    }

    const subEventsSorted = (updatedEvent.sub_events as any[])
      .map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp).getTime(),
      }))
      .sort((prev: any, next: any) => next.timestamp - prev.timestamp);

    const firstEvent = subEventsSorted.shift();
    const lastEvent = subEventsSorted.pop();

    const filteredLogBuckets = (logBucketsParsed as any[]).filter((bucket) => {
      const bucketTime = new Date(bucket.timestamp).getTime();
      return (
        bucketTime >= lastEvent.timestamp && bucketTime <= firstEvent.timestamp
      );
    });

    setSubEvents([...updatedEvent.sub_events, ...filteredLogBuckets]);
    setIsLoading(false);
  };

  useEffect(() => {
    getData();
  }, [event, currentCluster, currentProject]);

  const sortedSubEvents = useMemo(() => {
    if (!Array.isArray(subEvents)) {
      return [];
    }
    return subEvents
      .map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp).getTime(),
      }))
      .sort((prev, next) => next.timestamp - prev.timestamp)
      .map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp).toUTCString(),
      }));
  }, [subEvents]);

  return (
    <>
      <Timeline>
        <ControlRow>
          <BackButton onClick={clearSelectedEvent}>
            <i className="material-icons">close</i>
          </BackButton>
          <Icon
            status={event.event_type.toLowerCase() as any}
            className="material-icons-outlined"
          >
            {event.event_type === "critical" ? "report_problem" : "info"}
          </Icon>
          <div>
            Pod {event.name} crashed
            {event?.resource_type?.toLowerCase() === "pod" && (
              <StyledHelper>
                {hasPodStatusErrored ? (
                  "We couldn't retrieve last pod status, please try again later"
                ) : (
                  <>
                    {isPodStatusLoading ? (
                      "Loading last seen pod status"
                    ) : (
                      <>
                        Last seen pod status: {status}{" "}
                        <StatusColor
                          status={status?.toLowerCase()}
                        ></StatusColor>
                      </>
                    )}
                  </>
                )}
              </StyledHelper>
            )}
          </div>
        </ControlRow>
        {isLoading ? (
          <Placeholder>
            <Loading />
          </Placeholder>
        ) : sortedSubEvents?.length ? (
          <EventsGrid>
            <Rail />
            {sortedSubEvents.map((subEvent: any, i: number) => {
              if (subEvent?.event_type === "log_bucket") {
                return (
                  <Wrapper>
                    <TimelineNode>
                      <Penumbra>
                        <Circle />
                      </Penumbra>
                      {getReadableDate(subEvent.timestamp)}
                    </TimelineNode>
                    <LogBucketCard logEvent={subEvent} />
                    {i === sortedSubEvents.length - 1 && <RailCover />}
                  </Wrapper>
                );
              }
              return (
                <Wrapper>
                  <TimelineNode>
                    <Penumbra>
                      <Circle />
                    </Penumbra>
                    {getReadableDate(subEvent.timestamp)}
                  </TimelineNode>
                  <SubEventCard subEvent={subEvent} />
                  {i === sortedSubEvents.length - 1 && <RailCover />}
                </Wrapper>
              );
            })}
          </EventsGrid>
        ) : (
          <Placeholder>
            <i className="material-icons">search</i>
            No sub-events were found.
          </Placeholder>
        )}
      </Timeline>
    </>
  );
};

export default SubEventsList;

const StyledHelper = styled.div`
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
`;

const Placeholder = styled.div`
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 340px;
  margin-top: 20px;
  background: #ffffff08;
  height: calc(50vh - 60px);
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const RailCover = styled.div`
  background: #202227;
  height: 100%;
  width: 35px;
  position: absolute;
  top: 20px;
  left: 0;
`;

const Penumbra = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #202227;
  padding: 8px;
  border-radius: 30px;
  margin-right: 4px;
`;

const TimelineNode = styled.div`
  position: absolute;
  top: 0;
  left: 7px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  font-size: 13px;
`;

const Circle = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 20px;
  background: #aaaabb;
`;

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 35px;
  padding-left: 35px;
`;

const Rail = styled.div`
  position: absolute;
  top: -8px;
  left: 17px;
  width: 3px;
  height: 100%;
  z-index: -1;
  background: #36383d;
`;

const Timeline = styled.div`
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Icon = styled.span<{ status: "critical" | "normal" }>`
  font-size: 26px;
  margin-left: 17px;
  margin-right: 10px;
  color: ${({ status }) => (status === "critical" ? "#ff385d" : "#aaaabb")};
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 15px;
  padding-left: 0px;
  font-weight: 500;
`;

const BackButton = styled.div`
  display: flex;
  width: 37px;
  z-index: 1;
  cursor: pointer;
  height: 37px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  > i {
    font-size: 20px;
  }

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const EventsGrid = styled.div`
  position: relative;
  padding-top: 9px;
`;

const StatusColor = styled.div`
  display: inline-block;
  margin-right: 7px;
  width: 7px;
  min-width: 7px;
  height: 7px;
  background: ${(props: { status: string }) =>
    props.status === "running"
      ? "#4797ff"
      : props.status === "failed" || props.status === "deleted"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
`;
