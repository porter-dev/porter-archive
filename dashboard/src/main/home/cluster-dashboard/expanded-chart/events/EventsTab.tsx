import EventCard from "components/EventCard";
import EventLogs from "components/EventLogs";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

const mockData = [
  {
    id: 1,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-1",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
  {
    id: 2,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "normal",
    resource_type: "pod",
    name: "pod-test-2",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
  {
    id: 3,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
  {
    id: 4,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
  {
    id: 5,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
  {
    id: 6,
    project_id: 1,
    cluster_id: 6,
    owner_name: "pod-test",
    owner_type: "deployment",
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
    namespace: "default",
    message: "",
    reason: "OOM killed",
    timestamp: "2021-06-30T21:48:23Z",
  },
];

export type Event = {
  id: number;
  project_id: number;
  cluster_id: number;
  owner_name: string;
  owner_type: string;
  event_type: "critical" | "normal";
  resource_type: string;
  name: string;
  namespace: string;
  message: string;
  reason: string;
  timestamp: string;
};

type EventsTabProps = {};

const EventsTab: React.FunctionComponent<EventsTabProps> = () => {
  const [eventList, setEventList] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event>(null);

  useEffect(() => {
    setTimeout(() => {
      setEventList(mockData as Event[]);
    }, 500);
  }, []);

  const selectEvent = (id: number) => {
    const event = eventList.find((e) => e.id === id);
    setSelectedEvent(event);
  };

  const clearSelectedEvent = () => {
    setSelectedEvent(null);
  };

  return (
    <NamespaceListWrapper>
      <ControlRow>
        <button>
          <i className="material-icons">add</i> Add namespace
        </button>
      </ControlRow>

      {!selectedEvent && (
        <EventsGrid>
          {eventList.map((event) => {
            return (
              <EventCard
                key={event.id}
                event={event}
                selectEvent={selectEvent}
              />
            );
          })}
        </EventsGrid>
      )}
      {selectedEvent && (
        <EventLogs event={selectedEvent} goBack={clearSelectedEvent} />
      )}
    </NamespaceListWrapper>
  );
};

export default EventsTab;

const NamespaceListWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
