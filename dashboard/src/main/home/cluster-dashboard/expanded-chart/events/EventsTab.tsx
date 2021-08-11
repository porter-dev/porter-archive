import Card from "components/Card";
import React from "react";
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
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
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
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
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
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
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
    event_type: "critical",
    resource_type: "pod",
    name: "pod-test-2",
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

const EventsTab: React.FunctionComponent = () => {
  return (
    <EventsGrid>
      {mockData.map((event) => {
        return <Card event={event as Event} />;
      })}
    </EventsGrid>
  );
};

export default EventsTab;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
