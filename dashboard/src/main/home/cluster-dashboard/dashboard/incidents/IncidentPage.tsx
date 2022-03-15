import Loading from "components/Loading";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import TitleSection from "components/TitleSection";

import backArrow from "assets/back_arrow.png";
import nodePng from "assets/node.png";
import StatusSection from "components/StatusSection";

type IncidentPageParams = {
  incident_id: string;
};

const IncidentPage = () => {
  const { incident_id } = useParams<IncidentPageParams>();

  const [incident, setIncident] = useState<Incident>(null);

  useEffect(() => {
    let isSubscribed = true;

    setIncident(null);

    mockApi().then((res) => {
      if (isSubscribed) {
        setIncident(res.data);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [incident_id]);

  const events = useMemo(() => {
    return groupEventsByDate(incident?.events);
  }, [incident]);

  if (incident === null) {
    return <Loading />;
  }

  const handleClose = () => {};

  return (
    <StyledExpandedNodeView>
      <HeaderWrapper>
        <BackButton onClick={handleClose}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <TitleSection icon={nodePng}>{incident.incident_id}</TitleSection>
        <IncidentStatus status={incident.latest_state}>
          Status: <i>{incident.latest_state}</i>
        </IncidentStatus>
        <IncidentMessage>{incident.latest_message}</IncidentMessage>
      </HeaderWrapper>
      <LineBreak />
      <BodyWrapper>
        {Object.entries(events).map(([date, events_list]) => {
          return (
            <div>
              <div>{date}</div>

              {events_list.map((event) => {
                return <>{event.event_id}</>;
              })}
            </div>
          );
        })}
      </BodyWrapper>
    </StyledExpandedNodeView>
  );
};

export default IncidentPage;

const groupEventsByDate = (
  events: IncidentEvent[]
): { [key: string]: IncidentEvent[] } => {
  if (!events?.length) {
    return {};
  }

  return events.reduce<{ [key: string]: IncidentEvent[] }>(
    (accumulator, current) => {
      // @ts-ignore
      const date = Intl.DateTimeFormat([], { dateStyle: "full" }).format(
        new Date(current.timestamp)
      );

      if (accumulator[date]?.length) {
        accumulator[date].push(current);
      } else {
        accumulator[date] = [current];
      }

      return accumulator;
    },
    {}
  );
};

const mockApi = () =>
  new Promise<{ data: Incident }>((resolve) => {
    setTimeout(() => {
      resolve({ data: incident_mock });
    }, 1000);
  });

const incident_mock = {
  incident_id: "incident:sample-web:default", // eg: "incident:sample-web:default",
  release_name: "sample-web", // eg: "sample-web"
  latest_state: "ONGOING", // "ONGOING" or "RESOLVED"
  latest_reason: "Out of memory", // eg: "Out of memory",
  latest_message: "Application crash due to out of memory issue", // eg: "Application crash due to out of memory issue"
  events: [
    {
      event_id: "incident:sample-web:default:1647267140", // eg: "incident:sample-web:default:1647267140"
      pod_name: "sample-web-9x8dsa", // eg: "sample-web-9x8dsa"
      cluster: "crowdcow-production", // eg: "crowdcow-production"
      namespace: "production", // eg: "production"
      release_name: "sample-web", // eg: "sample-web" (release name)
      release_type: "Deployment", // "Deployment" or "Job"
      timestamp: 1549312452, // UNIX timestamp of event occurrence
      pod_phase: "Terminated", // eg: "Terminated"
      pod_status: "CrashLoopBackOff", // eg: "CrashLoopBackOff"
      reason: "Out of memory", // eg: "Out of memory"
      message: "Application crash due to out of memory issue", // eg: "Application crash due to out of memory issue",
      container_events: [
        {
          container_name: "web",
          reason: "Something",
          message: "Something",
          exit_code: 3,
          log_id: "Something", // eg: "log:<UUID>"
        },
      ],
    },
    {
      event_id: "Something", // eg: "incident:sample-web:default:1647267140"
      pod_name: "Something", // eg: "sample-web-9x8dsa"
      cluster: "Something", // eg: "crowdcow-production"
      namespace: "Something", // eg: "production"
      release_name: "Something", // eg: "sample-web" (release name)
      release_type: "Something", // "Deployment" or "Job"
      timestamp: 1549312452, // UNIX timestamp of event occurrence
      pod_phase: "Something", // eg: "Terminated"
      pod_status: "Something", // eg: "CrashLoopBackOff"
      reason: "Something", // eg: "Out of memory"
      message: "Something", // eg: "Application crash due to out of memory issue",
      container_events: [
        {
          container_name: "Something",
          reason: "Something",
          message: "Something",
          exit_code: 3,
          log_id: "Something", // eg: "log:<UUID>"
        },
      ],
    },
    {
      event_id: "Something", // eg: "incident:sample-web:default:1647267140"
      pod_name: "Something", // eg: "sample-web-9x8dsa"
      cluster: "Something", // eg: "crowdcow-production"
      namespace: "Something", // eg: "production"
      release_name: "Something", // eg: "sample-web" (release name)
      release_type: "Something", // "Deployment" or "Job"
      timestamp: 1647358791310, // UNIX timestamp of event occurrence
      pod_phase: "Something", // eg: "Terminated"
      pod_status: "Something", // eg: "CrashLoopBackOff"
      reason: "Something", // eg: "Out of memory"
      message: "Something", // eg: "Application crash due to out of memory issue",
      container_events: [
        {
          container_name: "Something",
          reason: "Something",
          message: "Something",
          exit_code: 3,
          log_id: "Something", // eg: "log:<UUID>"
        },
      ],
    },
  ],
};

type IncidentContainerEvent = {
  container_name: string;
  reason: string;
  message: string;
  exit_code: number;
  log_id: string;
};

type IncidentEvent = {
  event_id: string;
  pod_name: string;
  cluster: string;
  namespace: string;
  release_name: string;
  release_type: string;
  timestamp: number;
  pod_phase: string;
  pod_status: string;
  reason: string;
  message: string;
  container_events: IncidentContainerEvent[];
};

type Incident = {
  incident_id: string;
  release_name: string; // eg: "sample-web"
  latest_state: string; // "ONGOING" or "RESOLVED"
  latest_reason: string; // eg: "Out of memory",
  latest_message: string; // eg: "Application crash due to out of memory issue"
  events: IncidentEvent[];
};

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

const IncidentMessage = styled.span`
  display: block;
  font-size: 16px;
  color: #ffffff88;
  margin-top: 10px;
`;

const IncidentStatus = styled.span`
  display: block;
  font-size: 16px;
  color: #ffffff88;
  margin-top: 10px;
  > i {
    margin-left: 5px;
    color: ${(props: { status: string }) => {
      if (props.status === "ONGOING") {
        return "#f5cb42";
      }
      return "#00d12a";
    }};
  }
`;

const BackButton = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
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

const StatusWrapper = styled.div`
  margin-left: 3px;
  margin-bottom: 20px;
`;

const InstanceType = styled.div`
  font-weight: 400;
  color: #ffffff44;
  margin-left: 12px;
  font-size: 16px;
`;

const BodyWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const StyledExpandedNodeView = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  overflow-y: auto;
  padding-bottom: 120px;
  flex-direction: column;
  overflow: visible;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
