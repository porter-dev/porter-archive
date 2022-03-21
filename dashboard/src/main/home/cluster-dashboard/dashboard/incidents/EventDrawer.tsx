import Description from "components/Description";
import Loading from "components/Loading";
import { isEmpty } from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import ExpandedContainer from "./ExpandedContainer";
import { IncidentContainerEvent, IncidentEvent } from "./IncidentPage";

const EventDrawer: React.FC<{ event: IncidentEvent }> = ({ event }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [containerLogs, setContainerLogs] = useState<{ [key: string]: string }>(
    null
  );

  const containers: IncidentContainerEvent[] = useMemo(() => {
    if (isEmpty(event?.container_events)) {
      return [];
    }

    return Object.values(event?.container_events || {});
  }, [event]);

  useEffect(() => {
    if (!event) {
      return () => {};
    }

    let isSubscribed = true;

    const containersWithLogs = containers.filter(
      (container) => container.log_id
    );

    const promises = containersWithLogs.map((container) => {
      return api
        .getIncidentLogsByLogId<{ contents: string }>(
          "<token>",
          {
            log_id: container.log_id,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => ({
          contents: res.data?.contents,
          container_name: container.container_name,
        }));
    });

    Promise.all(promises)
      .then((data) => {
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
      })
      .catch(() => console.log("nope"));

    return () => {
      isSubscribed = false;
    };
  }, [containers]);

  if (!event) {
    return null;
  }

  if (!containerLogs) {
    return <Loading />;
  }

  return (
    <EventDrawerContainer>
      <EventDrawerTitle>Pod: {event?.pod_name}</EventDrawerTitle>
      <Description>
        Event reported on{" "}
        {Intl.DateTimeFormat([], {
          // @ts-ignore
          dateStyle: "full",
          timeStyle: "long",
        }).format(new Date(event?.timestamp))}
      </Description>
      <Description>{event?.message}</Description>
      {containers.map((container) => (
        <ExpandedContainer
          container={container}
          logs={containerLogs[container.container_name]}
        />
      ))}
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
  color: #ffffff;
`;
