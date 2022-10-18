import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import EventCard from "components/events/EventCard";
import Loading from "components/Loading";
import InfiniteScroll from "react-infinite-scroll-component";
import Dropdown from "components/Dropdown";
import { useKubeEvents } from "components/events/useEvents";
import { ChartType } from "shared/types";
import _, { isEmpty, isObject } from "lodash";
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

  const [hasControllers, setHasControllers] = useState(null);

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

  const {
    isLoading,
    hasPorterAgent,
    triggerInstall,
    kubeEvents,
    loadMoreEvents,
    hasMore,
  } = useKubeEvents({
    resourceType: resourceType.value as any,
    ownerName: selectedController?.metadata?.name,
    ownerType: selectedController?.kind,
    ownerNamespace: selectedController?.metadata?.namespace,
    shouldWaitForOwner: true,
  });

  useEffect(() => {
    let timer: NodeJS.Timeout = null;

    const checkControllers = (counter = 0) => {
      if (timer !== null) {
        clearTimeout(timer);
      }

      if (isEmpty(controllers) && counter === 5) {
        clearTimeout(timer);
        setHasControllers(false);
      } else {
        if (isEmpty(controllers)) {
          timer = setTimeout(() => {
            checkControllers(counter + 1);
          }, 2000);
        } else {
          setHasControllers(true);
        }
      }
    };

    checkControllers();

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [controllers]);

  if (isLoading && hasControllers === null) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (!hasControllers) {
    return (
      <Placeholder>
        <i className="material-icons">search</i>
        We coulnd't find any controllers for this application.
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
      {kubeEvents.length > 0 ? (
        <>
          <ControlRow>
            {/*
              <Dropdown
                selectedOption={resourceType}
                options={availableResourceTypes}
                onSelect={(o) => setResourceType({ ...o, value: o.value as string })}
              />
              */}
            <Label>Controller -</Label>
            <Dropdown
              selectedOption={currentControllerOption}
              options={controllerOptions}
              onSelect={(o) => setSelectedControllerKey(o?.value)}
            />
          </ControlRow>

          <InfiniteScroll
            dataLength={kubeEvents.length}
            next={loadMoreEvents}
            hasMore={hasMore}
            loader={<h4>Loading...</h4>}
            scrollableTarget="HomeViewWrapper"
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
        </>
      ) : (
        <Placeholder>
          <i className="material-icons">search</i>
          No matching events were found.
        </Placeholder>
      )}
    </EventsPageWrapper>
  );
};

export default EventsTab;

const Label = styled.div`
  color: #ffffff44;
  margin-right: 8px;
  font-size: 13px;
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-left: 0px;
  font-size: 13px;
`;

const EventsPageWrapper = styled.div`
  font-size: 13px;
  border-radius: 8px;
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
  background: #ffffff08;
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

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;
