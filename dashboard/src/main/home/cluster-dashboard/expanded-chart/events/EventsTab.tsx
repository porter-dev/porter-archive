import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import loadingSrc from "assets/loading.gif";
import { Context } from "shared/Context";
import { ChartType } from "../../../../../shared/types";
import api from "../../../../../shared/api";
import EventCard from "./EventCard";
import Loading from "components/Loading";
import EventDetail from "./EventDetail";

export type Event = {
  event_id: string;
  index: number;
  info: string;
  name: string;
  status: number;
  time: number;
};

export type EventContainer = {
  events: Event[];
  name: string;
  started_at: number;
};

export type KubeEvent = {
  cluster_id: number;
  event_type: string;
  id: number;
  message: string;
  name: string;
  namespace: string;
  owner_name: string;
  owner_type: string;
  project_id: number;
  reason: string;
  resource_type: string;
  timestamp: string;
};

type Props = {
  currentChart: ChartType;
};

const REFRESH_TIME = 15000;

const EventsTab: React.FunctionComponent<Props> = (props) => {
  const { currentChart } = props;
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [shouldRequest, setShouldRequest] = useState(true);
  const [eventData, setEventData] = useState<EventContainer[]>([]); // most recent event is last
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [hasPorterAgent, setHasPorterAgent] = useState(false);
  const [kubeEvents, setKubeEvents] = useState<KubeEvent[] | null>(null);

  // sort by time, ensure sequences are monotonically increasing by time, collapse by id
  const filterData = (data: Event[]) => {
    data = data.sort((a, b) => a.time - b.time);

    if (data.length == 0) return;

    let seq: Event[][] = [];
    let cur: Event[] = [data[0]];

    for (let i = 1; i < data.length; ++i) {
      if (data[i].index < data[i - 1].index) {
        seq.push(cur);
        cur = [];
      }
      cur.push(data[i]);
    }
    if (cur) seq.push(cur);

    let ret: EventContainer[] = [];
    seq.forEach((j) => {
      j.push({
        event_id: "",
        index: 0,
        info: "",
        name: "",
        status: 0,
        time: 0,
      });

      let fin: EventContainer = {
        events: [],
        name: "Deployment",
        started_at: j[0].time,
      };
      for (let i = 0; i < j.length - 1; ++i) {
        if (j[i].event_id != j[i + 1].event_id) {
          fin.events.push(j[i]);
        }
      }
      ret.push(fin);
    });

    setEventData(ret);
  };

  useEffect(() => {
    const getData = () => {
      if (!shouldRequest) return;
      setShouldRequest(false);
      api
        .getReleaseSteps(
          "<token>",
          {},
          {
            cluster_id: currentCluster.id,
            namespace: currentChart.namespace,
            id: currentProject.id,
            name: currentChart.name,
          }
        )
        .then((data) => {
          setIsLoading(false);
          filterData(data.data);
        })
        .catch((err) => {
          setIsError(true);
        })
        .finally(() => {
          setShouldRequest(true);
        });
    };

    getData();
    // const id = window.setInterval(getData, REFRESH_TIME);

    return () => {
      setIsLoading(true);
      // window.clearInterval(id);
    };
  }, [currentProject, currentCluster, currentChart]);

  useEffect(() => {
    let isSubscribed = true;

    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .detectPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setHasPorterAgent(true);
      })
      .catch(() => {
        setHasPorterAgent(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

  useEffect(() => {
    let isSubscribed = true;

    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    if (hasPorterAgent) {
      api
        .getKubeEvents("<token>", {}, { project_id, cluster_id })
        .then((res) => {
          setKubeEvents(res.data);
          setIsLoading(false);
        })
        .catch((error) => console.log(error));
    }
  }, [currentProject, currentCluster, hasPorterAgent]);

  const installPorterAgent = () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setHasPorterAgent(true);
      })
      .catch(() => {
        setHasPorterAgent(false);
      });
  };

  const parseToEvent = (kubeEvent: KubeEvent, index: number): Event => {
    return {
      event_id: `${kubeEvent.id}`,
      index,
      info: kubeEvent.message,
      name: kubeEvent.name,
      status: 0,
      time: new Date(kubeEvent.timestamp).getTime(),
    };
  };

  if (!hasPorterAgent) {
    return (
      <InstallPorterAgentButton onClick={() => installPorterAgent()}>
        Install porter agent
      </InstallPorterAgentButton>
    );
  }

  // if (isError) {
  //   return <Placeholder>Error loading events.</Placeholder>;
  // }

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (eventData.length === 0 && !kubeEvents?.length) {
    return (
      <Placeholder>
        <i className="material-icons">category</i>
        No application events found.
      </Placeholder>
    );
  }

  if (selectedEvent !== null) {
    return (
      <EventDetail
        container={eventData[selectedEvent]}
        resetSelection={() => {
          setSelectedEvent(null);
          return null;
        }}
      />
    );
  }

  return (
    <EventsGrid>
      {kubeEvents.map(parseToEvent).map((event, i) => {
        return (
          <React.Fragment key={i}>
            <EventCard
              event={event}
              selectEvent={() => {
                console.log("SELECTED", event);
              }}
            />
          </React.Fragment>
        );
      })}
      {eventData
        .slice(0)
        .reverse()
        .map((dat, i) => {
          console.log(dat.started_at);
          return (
            <React.Fragment key={dat.started_at}>
              <EventCard
                event={dat.events[dat.events.length - 1]}
                selectEvent={() => {
                  setSelectedEvent(eventData.length - i - 1);
                }}
                overrideName={"Deployment"}
              />
            </React.Fragment>
          );
        })}
    </EventsGrid>
  );
};

export default EventsTab;

const EventsPageWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;

const InstallPorterAgentButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border: none;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  min-height: 300px;
  height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 10px;
  }
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
