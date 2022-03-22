import Description from "components/Description";
import useLastSeenPodStatus from "components/events/useLastSeenPodStatus";
import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import { isEmpty } from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { capitalize, readableDate } from "shared/string_utils";
import styled from "styled-components";
import ExpandedContainer from "./ExpandedContainer";
import { IncidentContainerEvent, IncidentEvent } from "./IncidentPage";
import backArrow from "assets/back_arrow.png";

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
      <BackButton onClick={closeDrawer}>
        <BackButtonImg src={backArrow} />
      </BackButton>
      <EventDrawerTitle>Pod: {event?.pod_name}</EventDrawerTitle>
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

const PorterFormContainer = styled.div`
  position: relative;
  min-width: 300px;
`;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const BackArrowContainer = styled.div`
  width: 100%;
  height: 24px;
`;

const BackArrow = styled.div`
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 6px;
  }

  color: #aaaabb;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  width: 120px;
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

const LogTitleContainer = styled.div`
  padding: 0 20px;
  margin-bottom: 20px;
`;

const LogSectionContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  overflow: hidden;
  max-height: 500px;
  font-size: 13px;
`;

const LogContainer = styled.div`
  padding: 14px;
  font-size: 13px;
  background: #121318;
  user-select: text;
  overflow-wrap: break-word;
  overflow-y: auto;
  min-height: 55px;
  color: #aaaabb;
  height: 400px;
`;

const Log = styled.div`
  font-family: monospace, sans-serif;
  font-size: 12px;
  color: white;
`;

const StyledHelper = styled.div`
  color: #aaaabb;
  line-height: 1.6em;
  font-size: 13px;
  margin-top: 6px;
`;

const Placeholder = styled.div`
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 340px;
  margin-top: 20px;
  background: #ffffff08;
  height: calc(50vh - 60px);
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const RailCover = styled.div`
  background: #202227;
  height: 100%;
  width: 35px;
  position: absolute;
  top: 20px;
  left: 0;
`;

const Penumbra = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #202227;
  padding: 8px;
  border-radius: 30px;
  margin-right: 4px;
`;

const TimelineNode = styled.div`
  position: absolute;
  top: 0;
  left: 7px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  font-size: 13px;
`;

const Circle = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 20px;
  background: #aaaabb;
`;

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 35px;
  padding-left: 35px;
`;

const Rail = styled.div`
  position: absolute;
  top: -8px;
  left: 17px;
  width: 3px;
  height: 100%;
  z-index: -1;
  background: #36383d;
`;

const Timeline = styled.div`
  margin-top: ${(props: { enableTopMargin: boolean }) =>
    props.enableTopMargin ? "30px" : "unset"};
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Icon = styled.span<{ status: "critical" | "normal" }>`
  font-size: 26px;
  margin-left: 17px;
  margin-right: 10px;
  color: ${({ status }) => (status === "critical" ? "#ff385d" : "#aaaabb")};
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 15px;
  padding-left: 0px;
  font-weight: 500;
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

const EventsGrid = styled.div`
  position: relative;
  padding-top: 9px;
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

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
