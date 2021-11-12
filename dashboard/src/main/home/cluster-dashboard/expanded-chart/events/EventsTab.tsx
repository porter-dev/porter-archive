import React, { useMemo, useState } from "react";
import styled from "styled-components";
import EventCard from "components/events/EventCard";
import Loading from "components/Loading";
import InfiniteScroll from "react-infinite-scroll-component";
import Dropdown from "components/Dropdown";
import { useKubeEvents } from "components/events/useEvents";
import { ChartType } from "shared/types";
import _, { isObject } from "lodash";
import SubEventsList from "components/events/SubEventsList";

const availableResourceTypes = [
  { label: "Pods", value: "pod" },
  { label: "HPA", value: "hpa" },
];

const EventsTab: React.FC<{
  controllers: Record<string, Record<string, any>>;
}> = (props) => {
  const { controllers } = props;
  const [resourceType, setResourceType] = useState(availableResourceTypes[0]);
  const [currentEvent, setCurrentEvent] = useState(null);

  const [selectedControllerKey, setSelectedControllerKey] = useState(null);

  const controllerOptions = useMemo(() => {
    if (typeof controllers !== "object") {
      return [];
    }

    return Object.entries(controllers).map(([key, value]) => ({
      label: value?.metadata?.name,
      value: key,
    }));
  }, [controllers]);

  const currentControllerOption = useMemo(() => {
    return (
      controllerOptions?.find((c) => c.value === selectedControllerKey) ||
      controllerOptions[0]
    );
  }, [selectedControllerKey, controllerOptions]);

  const selectedController = controllers[currentControllerOption?.value];

  console.log(controllers, currentControllerOption);
  const {
    isLoading,
    hasPorterAgent,
    triggerInstall,
    kubeEvents,
    loadMoreEvents,
    hasMore,
  } = useKubeEvents(
    resourceType.value as any,
    selectedController?.metadata?.name,
    selectedController?.kind
  );

  const hasControllers = controllers && Object.keys(controllers)?.length;

  if (isLoading || !hasControllers) {
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
          <Header>We couldn't detect the Porter agent on your cluster</Header>
          In order to use the events tab, you need to install the Porter agent
          on your cluster.
          <InstallPorterAgentButton onClick={() => triggerInstall()}>
            <i className="material-icons">add</i> Install Porter agent
          </InstallPorterAgentButton>
        </div>
      </Placeholder>
    );
  }

  if (currentEvent) {
    return (
      <SubEventsList
        event={currentEvent}
        clearSelectedEvent={() => setCurrentEvent(null)}
      />
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
        <RightFilters>
          <Dropdown
            selectedOption={currentControllerOption}
            options={controllerOptions}
            onSelect={(o) => setSelectedControllerKey(o?.value)}
          />
        </RightFilters>
      </ControlRow>

      <InfiniteScroll
        dataLength={kubeEvents.length}
        next={loadMoreEvents}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        scrollableTarget="HomeViewWrapper"
        endMessage={
          <h4>No events were found for the resource type you specified</h4>
        }
      >
        <EventsGrid>
          {kubeEvents.map((event, i) => {
            return (
              <React.Fragment key={i}>
                <EventCard
                  event={event as any}
                  selectEvent={() => {
                    setCurrentEvent(event);
                  }}
                />
              </React.Fragment>
            );
          })}
        </EventsGrid>
      </InfiniteScroll>
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
  border-radius: 5px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 20px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#5561C0"};
  :hover {
    filter: ${(props) => (!props.disabled ? "brightness(120%)" : "")};
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
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 10px;
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
