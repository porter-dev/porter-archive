import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import EventCard from "components/events/EventCard";
import Loading from "components/Loading";
import EventDetail from "components/events/EventDetail";
import { ChartType } from "shared/types";
import api from "shared/api";
import InfiniteScroll from "react-infinite-scroll-component";
import { Event } from "../../expanded-chart/events/EventsTab";
import { unionBy } from "lodash";

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

const EventsTab = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [hasPorterAgent, setHasPorterAgent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [kubeEvents, setKubeEvents] = useState<KubeEvent[]>([]);
  const [hasErrors, setHasErrors] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
    fetchData(true);
  }, [currentProject?.id, currentCluster?.id, hasPorterAgent]);

  const fetchData = async (clear?: boolean) => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    const skipBy = kubeEvents?.length;
    console.log("PREVIOUS", kubeEvents?.length);
    if (hasPorterAgent) {
      api
        .getKubeEvents("<token>", {}, { project_id, cluster_id, skipBy })
        .then((res) => {
          if (clear) {
            setKubeEvents(res.data);
          } else {
            const newEvents = unionBy(kubeEvents, res.data, "id");
            setKubeEvents(newEvents);
            if (newEvents.length === kubeEvents?.length) {
              setHasMore(false);
            } else {
              setHasMore(true);
            }
          }

          setIsLoading(false);
        })
        .catch((error) => console.log(error));
    }
  };

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
      <Placeholder>
        <div>
          <Header>We coulnd't detect porter agent :(</Header>
          In order to use the events tab you should install the porter agent!
          <InstallPorterAgentButton onClick={() => installPorterAgent()}>
            <i className="material-icons">add</i> Install porter agent
          </InstallPorterAgentButton>
        </div>
      </Placeholder>
    );
  }

  return (
    <EventsGrid>
      <InfiniteScroll
        dataLength={kubeEvents.length}
        next={fetchData}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        scrollableTarget="HomeViewWrapper"
      >
        {/* {kubeEvents.map((_, index) => (
          <div key={index}>div - #{index}</div>
        ))} */}
        {kubeEvents.map(parseToEvent).map((event, i) => {
          return (
            <React.Fragment key={i}>
              <EventCard
                event={event as Event}
                selectEvent={() => {
                  console.log("SELECTED", event);
                }}
              />
            </React.Fragment>
          );
        })}
      </InfiniteScroll>
    </EventsGrid>
  );
};

export default EventsTab;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
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
  min-height: 200px;
  height: 20vh;
  padding: 30px;
  padding-bottom: 90px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;
