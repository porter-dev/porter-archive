import Description from "components/Description";
import useLastSeenPodStatus from "components/events/useLastSeenPodStatus";
import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import { isEmpty } from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { capitalize } from "shared/string_utils";
import styled from "styled-components";
import ExpandedContainer from "./ExpandedContainer";
import { IncidentContainerEvent, IncidentEvent } from "./IncidentPage";

const EventDrawer: React.FC<{
  event: IncidentEvent;
  closeDrawer: () => void;
}> = ({ event, closeDrawer }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [containerLogs, setContainerLogs] = useState<{ [key: string]: string }>(
    null
  );

  const {
    status,
    hasError: hasPodStatusErrored,
    isLoading: isPodStatusLoading,
  } = useLastSeenPodStatus({
    podName: event?.pod_name,
    namespace: event?.namespace,
    resource_type: "pod",
  });

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
      <EventDrawerTitleContainer>
        <EventDrawerTitle>Pod: {event?.pod_name}</EventDrawerTitle>
        <BackButton onClick={closeDrawer}>
          <i className="material-icons">close</i>
        </BackButton>
      </EventDrawerTitleContainer>

      <StyledHelper>
        {hasPodStatusErrored ? (
          "We couldn't retrieve last pod status, please try again later"
        ) : (
          <>
            {isPodStatusLoading ? (
              <Loading />
            ) : (
              <>
                Latest pod status: {capitalize(status)}{" "}
                <StatusColor status={status?.toLowerCase()}></StatusColor>
              </>
            )}
          </>
        )}
      </StyledHelper>
      <MetadataContainer>
        <Heading>Overview</Heading>
        <Description>
          Event reported on{" "}
          {Intl.DateTimeFormat([], {
            // @ts-ignore
            dateStyle: "full",
            timeStyle: "long",
          }).format(new Date(event?.timestamp))}
        </Description>
        <Description>{event?.message}</Description>
        <Br />
      </MetadataContainer>
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
  position: relative;
  color: #ffffff;
  padding: 25px 30px;
`;

const EventDrawerTitle = styled.span`
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
`;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const MetadataContainer = styled.div`
  border-radius: 6px;
  background: #2e3135;
  padding: 0 20px;
  overflow-y: auto;
  min-height: 100px;
  font-size: 13px;
  margin: 12px 0;
`;

const StyledHelper = styled.div`
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
  margin-top: 6px;
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
  color: #ffffffaa;

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

const EventDrawerTitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
