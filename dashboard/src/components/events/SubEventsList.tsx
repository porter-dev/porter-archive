import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import api from "shared/api";
import { Context } from "shared/Context";
import SubEventCard from "./sub-events/SubEventCard";
import Loading from "components/Loading";
import LogBucketCard from "./sub-events/LogBucketCard";

const SubEventsList: React.FC<{
  clearSelectedEvent: () => void;
  event: any;
}> = ({ event, clearSelectedEvent }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [subEvents, setSubEvents] = useState(null);

  const getData = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    const kube_event_id = event?.id;

    try {
      const updatedEvent = await api
        .getKubeEvent("<token>", {}, { project_id, cluster_id, kube_event_id })
        .then((res) => res?.data);

      const logBucketsData = await api
        .getLogBuckets("token", {}, { project_id, cluster_id, kube_event_id })
        .then((res) => res?.data);

      const logBucketsParsed = logBucketsData.log_buckets.map(
        (bucket: string) => {
          const [
            _resourceType,
            _namespace,
            resource_name,
            timestamp,
          ] = bucket.split(":");
          return {
            event_type: "log_bucket",
            resource_name,
            timestamp: new Date(timestamp).toUTCString(),
            parent_id: updatedEvent?.id,
          };
        }
      );

      setSubEvents([...updatedEvent.sub_events, ...logBucketsParsed]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
      <ControlRow>
        <div>
          <BackButton onClick={clearSelectedEvent}>
            <BackButtonImg src={backArrow} />
          </BackButton>
        </div>
      </ControlRow>
      {isLoading ? (
        <Loading />
      ) : sortedSubEvents?.length ? (
        <EventsGrid>
          {sortedSubEvents.map((subEvent: any) => {
            if (subEvent?.event_type === "log_bucket") {
              return <LogBucketCard logEvent={subEvent} />;
            }
            return <SubEventCard subEvent={subEvent} />;
          })}
        </EventsGrid>
      ) : (
        "No sub events found for this resource "
      )}
    </>
  );
};

export default SubEventsList;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 35px;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const BackButton = styled.div`
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
