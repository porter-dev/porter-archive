import React, { useEffect, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import Dropdown from "components/Dropdown";
import EventCard from "components/EventCard";
import EventLogs from "components/EventLogs";

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
  const [currentFilter, setCurrentFilter] = useState<string>("all");

  useEffect(() => {
    setTimeout(() => {
      setEventList(
        (mockData as Event[]).filter(
          (e) => currentFilter === "all" || e.resource_type === currentFilter
        )
      );
    }, 500);
  }, [currentFilter]);

  const selectEvent = (id: number) => {
    const event = eventList.find((e) => e.id === id);
    setSelectedEvent(event);
  };

  const clearSelectedEvent = () => {
    setSelectedEvent(null);
  };

  const handleEventTypeSelection = (option: {
    label: string;
    value: string;
  }) => {
    console.log(option);
    setCurrentFilter(option.value);
  };

  return (
    <NamespaceListWrapper>
      {!selectedEvent && (
        <>
          <ControlRow>
            <div>
              <Dropdown
                options={[
                  { label: "All", value: "all" },
                  { label: "Pods", value: "pod" },
                  { label: "HPA", value: "HPA" },
                ]}
                onSelect={handleEventTypeSelection}
              />
            </div>
          </ControlRow>
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
        </>
      )}
      {selectedEvent && (
        <>
          <ControlRow>
            <div>
              <BackButton onClick={clearSelectedEvent}>
                <BackButtonImg src={backArrow} />
              </BackButton>
            </div>
          </ControlRow>
          <EventLogs event={selectedEvent} />
        </>
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
