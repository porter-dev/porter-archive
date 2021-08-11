import React from "react";

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
];

const EventsTab = () => {
  return <div>Events tab</div>;
};

export default EventsTab;
