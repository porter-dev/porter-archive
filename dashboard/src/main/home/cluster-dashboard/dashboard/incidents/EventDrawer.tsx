import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { IncidentEvent } from "./IncidentPage";

const EventDrawer: React.FC<{ event: IncidentEvent }> = ({ event }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [containerLogs, setContainerLogs] = useState<{ [key: string]: string }>(
    null
  );

  useEffect(() => {
    if (!event) {
      return () => {};
    }

    let isSubscribed = true;
    const promises = event.container_events.map((container) => {
      return api
        .getIncidentLogsByLogId<{ contents: string }>(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: event.namespace,
            release_name: event.release_name,
            log_id: container.log_id,
          }
        )
        .then((res) => ({
          contents: res.data?.contents,
          container_name: container.container_name,
        }));
    });

    Promise.all(promises).then((data) => {
      if (!isSubscribed) {
        return;
      }

      const tmpContainerLogs = data.reduce<{ [key: string]: string }>(
        (acc, c) => {
          acc[c.container_name] = c.contents;
          return acc;
        },
        {}
      );

      setContainerLogs(tmpContainerLogs);
    });

    return () => {
      isSubscribed = false;
    };
  }, [event]);

  if (!event) {
    return null;
  }

  return (
    <EventDrawerContainer>
      <EventDrawerTitle>{event?.pod_name}</EventDrawerTitle>
      <span>{event?.message}</span>

      <div>
        <span>Pod Phase: {event?.pod_phase}</span>
        <span>Pod Status: {event?.pod_status}</span>
      </div>
      {event.container_events.map((container) => {
        return (
          <>
            <h3>{container.container_name}</h3>
            <span>
              {container.message} - Exit Code: {container.exit_code}
            </span>
            <div>{containerLogs[container.container_name]}</div>
          </>
        );
      })}
      {Object.entries(containerLogs || {}).map(([key, value]) => {
        return (
          <>
            <h3>{key}</h3>
            <div>{value}</div>
          </>
        );
      })}
    </EventDrawerContainer>
  );
};

export default EventDrawer;

const EventDrawerContainer = styled.div`
  color: #ffffff;
  padding: 25px 30px;
`;

const EventDrawerTitle = styled.span`
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #ffffff90;
`;
