import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import EventCard from "components/events/EventCard";
import Loading from "components/Loading";
import EventDetail from "components/events/EventDetail";
import { ChartType, KubeEvent } from "shared/types";
import api from "shared/api";
import InfiniteScroll from "react-infinite-scroll-component";
import { unionBy } from "lodash";
import Dropdown from "components/Dropdown";

const availableResourceTypes = [
  { label: "Pods", value: "pod" },
  { label: "HPA", value: "hpa" },
  { label: "Nodes", value: "node" },
];

const EventsTab = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [hasPorterAgent, setHasPorterAgent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [kubeEvents, setKubeEvents] = useState<KubeEvent[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [resourceType, setResourceType] = useState(availableResourceTypes[0]);

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
    if (hasPorterAgent) {
      fetchData(true).then(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [
    currentProject?.id,
    currentCluster?.id,
    hasPorterAgent,
    resourceType?.value,
  ]);

  const fetchData = async (clear?: boolean) => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    let skipBy;
    if (!clear) {
      skipBy = kubeEvents?.length;
    } else {
      setHasMore(true);
    }

    const type = resourceType?.value;
    try {
      const newKubeEvents = await api
        .getKubeEvents("<token>", { skip: skipBy }, { project_id, cluster_id })
        .then((res) => res.data);

      if (!newKubeEvents?.length) {
        setHasMore(false);
        return;
      }

      if (clear) {
        setKubeEvents(newKubeEvents);
      } else {
        const newEvents = unionBy(kubeEvents, newKubeEvents, "id");
        setKubeEvents(newEvents);
        if (newEvents.length === kubeEvents?.length) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(isLoading);
  }, [isLoading]);

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

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

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
    <EventsPageWrapper>
      <ControlRow>
        <Dropdown
          selectedOption={resourceType}
          options={availableResourceTypes}
          onSelect={(o) => setResourceType({ ...o, value: o.value as string })}
        />
        {/* <RightFilters> */}
        {/* <Dropdown
            selectedOption={currentLimit}
            options={availableLimitOptions}
            onSelect={(o) =>
              setCurrentLimit({ ...o, value: o.value as number })
            }
          />
        </RightFilters> */}
      </ControlRow>
      <EventsGrid>
        <InfiniteScroll
          dataLength={kubeEvents.length}
          next={fetchData}
          hasMore={hasMore}
          loader={<h4>Loading...</h4>}
          scrollableTarget="HomeViewWrapper"
          endMessage={
            <h4>No events were found for the resource type you specified</h4>
          }
        >
          {/* {kubeEvents.map((_, index) => (
          <div key={index}>div - #{index}</div>
        ))} */}
          {kubeEvents.map((event, i) => {
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
        </InfiniteScroll>
      </EventsGrid>
    </EventsPageWrapper>
  );
};

export default EventsTab;

const RightFilters = styled.div`
  display: flex;
  > div {
    :not(:last-child) {
      margin-right: 15px;
    }
  }
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const EventsPageWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;

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
