import { Event } from "main/home/cluster-dashboard/expanded-chart/events/EventsTab";
import React from "react";

type EventLogsProps = {
  event: Event;
};

const EventLogs: React.FunctionComponent<EventLogsProps> = ({}) => {
  return <div>Show logs</div>;
};

export default EventLogs;
