import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import Dropdown from "components/Dropdown";
import { Event, EventContext } from "./EventsContext";
import EventCard from "./EventCard";

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

const EventsList: React.FunctionComponent = ({}) => {
  const { eventList, selectEvent, setResourceType } = useContext(EventContext);

  const handleEventTypeSelection = (option: {
    label: string;
    value: "pod" | "hpa";
  }) => {
    setResourceType(option.value);
  };

  return (
    <div>
      <ControlRow>
        <div>
          <Dropdown
            options={[
              { label: "Pods", value: "pod" },
              { label: "HPA", value: "hpa" },
            ]}
            onSelect={handleEventTypeSelection}
          />
        </div>
      </ControlRow>
      <EventsGrid>
        {eventList.map((event) => {
          return (
            <EventCard key={event.id} event={event} selectEvent={selectEvent} />
          );
        })}
      </EventsGrid>
    </div>
  );
};

export default EventsList;

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
