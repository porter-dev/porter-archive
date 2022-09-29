import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import styled from "styled-components";

import loading from "assets/loading.gif";
import { Drawer, withStyles } from "@material-ui/core";
import EventDrawer from "./EventDrawer";
import { useRouting } from "shared/routing";
import api from "shared/api";
import { Context } from "shared/Context";
import DynamicLink from "components/DynamicLink";
import Header from "components/expanded-object/Header";
import { capitalize } from "shared/string_utils";
import Description from "components/Description";
import { dateFormatter } from "../../chart/JobRunTable";

type IncidentPageParams = {
  incident_id: string;
};

const IncidentPage = () => {
  const { incident_id } = useParams<IncidentPageParams>();

  const { currentProject, currentCluster } = useContext(Context);

  const [incident, setIncident] = useState<Incident>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IncidentEvent>(null);

  const { getQueryParam, pushFiltered } = useRouting();

  useEffect(() => {
    let isSubscribed = true;

    setIncident(null);

    api
      .getIncidentById<Incident>(
        "<token>",
        { incident_id },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }

        let incident = res.data;

        incident.events = convertEventsTimestampsToMilliseconds(
          incident.events
        );

        setIncident(incident);
      });

    return () => {
      isSubscribed = false;
    };
  }, [incident_id]);

  const refreshIncident = async () => {
    setIsRefreshing(true);
    try {
      let incident = await api
        .getIncidentById<Incident>(
          "<token>",
          { incident_id },
          {
            cluster_id: currentCluster.id,
            project_id: currentProject.id,
          }
        )
        .then((res) => res.data);

      incident.events = convertEventsTimestampsToMilliseconds(incident.events);

      setIncident(incident);
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  const events = useMemo(() => {
    return groupEventsByDate(incident?.events);
  }, [incident]);

  if (incident === null) {
    return <Loading />;
  }

  const getBackLink = () => {
    return (
      getQueryParam("redirect_url") ||
      "/cluster-dashboard?selected_tab=incidents"
    );
  };

  const getResourceLink = () => {
    let chartName = incident?.chart_name.split("-")[0] || "web";
    let namespace = incident?.incident_id.split(":")[2] || "default";

    if (chartName == "job") {
      return `/jobs/${currentCluster.name}/${namespace}/${incident?.release_name}`;
    }

    return `/applications/${currentCluster.name}/${namespace}/${incident?.release_name}`;
  };

  return (
    <StyledExpandedNodeView>
      <HeaderWrapper>
        <Header
          last_updated={dateFormatter(incident.updated_at * 1000)}
          back_link={getBackLink()}
          name={"Incident for " + incident.release_name}
          icon={"error"}
          materialIconClass="material-icons"
          inline_title_items={[
            <ResourceLink
              key="resource_link"
              to={getResourceLink()}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              {incident.release_name}
              <i className="material-icons">open_in_new</i>
            </ResourceLink>,
          ]}
          sub_title_items={[
            <StatusContainer>
              <Status>
                <StatusDot status={incident.latest_state} />
                {capitalize(incident.latest_state)}
              </Status>
              <StatusText>
                - started {dateFormatter(incident.created_at * 1000)}, last
                updated {dateFormatter(incident.updated_at * 1000)}
              </StatusText>
              <Description></Description>
            </StatusContainer>,
          ]}
        />
      </HeaderWrapper>
      <LineBreak />
      <BodyWrapper>
        <RefreshButton onClick={refreshIncident} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <img src={loading} alt="loading icon" />
            </>
          ) : (
            <i className="material-icons">refresh</i>
          )}
        </RefreshButton>
        {Object.entries(events).map(([date, events_list]) => (
          <React.Fragment key={date}>
            <StyledDate>{date}</StyledDate>

            {events_list.map((event) => {
              return (
                <StyledCard
                  key={event.event_id}
                  onClick={() => setSelectedEvent(event)}
                  active={selectedEvent?.event_id === event.event_id}
                >
                  <ContentContainer>
                    <Icon status={"normal"} className="material-icons-outlined">
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
          </React.Fragment>
        ))}
      </BodyWrapper>
      <StyledDrawer
        anchor="right"
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      >
        <EventDrawer
          event={selectedEvent}
          closeDrawer={() => setSelectedEvent(null)}
        />
      </StyledDrawer>
    </StyledExpandedNodeView>
  );
};

export default IncidentPage;

const convertEventsTimestampsToMilliseconds = (events: IncidentEvent[]) => {
  return events.map((e) => {
    let newEvent = e;

    newEvent.timestamp = newEvent.timestamp * 1000;

    return newEvent;
  });
};

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
  container_events: {
    [key: string]: IncidentContainerEvent;
  };
};

export type Incident = {
  incident_id: string;
  release_name: string; // eg: "sample-web"
  latest_state: string; // "ONGOING" or "RESOLVED"
  latest_reason: string; // eg: "Out of memory",
  latest_message: string; // eg: "Application crash due to out of memory issue"
  events: IncidentEvent[];
  created_at: number;
  updated_at: number;
  chart_name: string;
};

const RefreshButton = styled.button`
  position: absolute;
  right: 0px;
  top: 20px;
  border: 1px solid #ffffff00;
  border-radius: 50%;
  background: inherit;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;

  > i {
    font-size: 20px;
  }
  > img {
    width: 20px;
    height: 20px;
  }

  :hover {
    color: #ffffff88;
    border-color: #ffffff88;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 10px 0px 35px;
`;

const BodyWrapper = styled.div`
  position: relative;
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

const ResourceLink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 20px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-left: 1px;
  min-height: 17px;
  color: #a7a6bb;
  margin-right: 6px;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "ONGOING" ? "#ed5f85" : "#4797ff"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #aaaabb;
  width: 100%;
`;

const StatusText = styled.div`
  width: 100%;
`;
