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

  return (
    <EventsGrid>
      <InfiniteScroll
        dataLength={kubeEvents.length}
        next={fetchData}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        scrollableTarget="MainViewWrapper"
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
