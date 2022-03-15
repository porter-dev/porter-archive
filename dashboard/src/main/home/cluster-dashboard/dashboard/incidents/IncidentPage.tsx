import Loading from "components/Loading";
import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router";
import styled from "styled-components";
import TitleSection from "components/TitleSection";

import backArrow from "assets/back_arrow.png";
import nodePng from "assets/node.png";
import { Drawer, withStyles } from "@material-ui/core";
import EventDrawer from "./EventDrawer";
import { useRouting } from "shared/routing";

type IncidentPageParams = {
  incident_id: string;
};

const IncidentPage = () => {
  const { incident_id } = useParams<IncidentPageParams>();

  const [incident, setIncident] = useState<Incident>(null);

  const [selectedEvent, setSelectedEvent] = useState<IncidentEvent>(null);

  const { getQueryParam, pushFiltered } = useRouting();

  const history = useHistory();

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

  const handleClose = () => {
    const redirect_url = getQueryParam("redirect_url");
    if (!redirect_url) {
      pushFiltered("/cluster-dashboard", []);
      return;
    }

    pushFiltered(redirect_url, []);
  };

  return (
    <StyledExpandedNodeView>
      <HeaderWrapper>
        <BackButton onClick={handleClose}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <TitleSection icon={nodePng}>{incident.incident_id}</TitleSection>
        <IncidentMessage>{incident.latest_message}</IncidentMessage>
        <IncidentStatus status={incident.latest_state}>
          Status: <i>{incident.latest_state}</i>
        </IncidentStatus>
      </HeaderWrapper>
      <LineBreak />
      <BodyWrapper>
        {Object.entries(events).map(([date, events_list]) => {
          return (
            <>
              <StyledDate>{date}</StyledDate>

              {events_list.map((event) => {
                return (
                  <StyledCard
                    onClick={() => setSelectedEvent(event)}
                    active={selectedEvent?.event_id === event.event_id}
                  >
                    <ContentContainer>
                      <Icon
                        status={"normal"}
                        className="material-icons-outlined"
                      >
                        info
                      </Icon>
                      <EventInformation>
                        <EventName>
                          <Helper>Pod:</Helper>
                          {event.pod_name}
                        </EventName>
                        <EventReason>{event.message}</EventReason>
                      </EventInformation>
                    </ContentContainer>
                    <ActionContainer>
                      <TimestampContainer>
                        <TimestampIcon className="material-icons-outlined">
                          access_time
                        </TimestampIcon>
                        <span>
                          {Intl.DateTimeFormat([], {
                            // @ts-ignore
                            dateStyle: "full",
                            timeStyle: "long",
                          }).format(new Date(event.timestamp))}
                        </span>
                      </TimestampContainer>
                    </ActionContainer>
                  </StyledCard>
                );
              })}
            </>
          );
        })}
      </BodyWrapper>
      <StyledDrawer
        anchor="right"
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      >
        <EventDrawer event={selectedEvent} />
      </StyledDrawer>
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

export type IncidentContainerEvent = {
  container_name: string;
  reason: string;
  message: string;
  exit_code: number;
  log_id: string;
};

export type IncidentEvent = {
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

export type Incident = {
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

const StyledDate = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 20px;
  margin-top: 20px;
  :first-child {
    margin-top: 0px;
  }
`;

const StyledCard = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid ${({ active }) => (active ? "#819bfd" : "#ffffff44")};
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
  font-size: 13px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    border: 1px solid ${({ active }) => (active ? "#819bfd" : "#ffffff66")};
  }
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  :not(:last-child) {
    margin-bottom: 15px;
  }
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span<{ status: "critical" | "normal" }>`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 20px;
  color: ${({ status }) => (status === "critical" ? "#ff385d" : "#aaaabb")};
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const Helper = styled.span`
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const EventReason = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  margin-top: 5px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const TimestampContainer = styled.div`
  display: flex;
  white-space: nowrap;
  align-items: center;
  justify-self: flex-end;
  color: #ffffff55;
  margin-right: 10px;
  font-size: 13px;
  min-width: 130px;
  justify-content: space-between;
`;

const TimestampIcon = styled.span`
  margin-right: 7px;
  font-size: 18px;
`;

const StyledDrawer = withStyles({
  paperAnchorRight: {
    background: "#202227",
    minWidth: "700px",
  },
})(Drawer);
