import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Dropdown from "components/Dropdown";
import EventCard from "./EventCard";

import { Event } from "./EventsTab";
import api from "shared/api";
import { Context } from "shared/Context";

import loadingSrc from "assets/loading.gif";

import mockData from "./MockData";

type EventController = { type: string; name: string };

const removeDuplicatedEvents = (events: Event[]) => {
  return events.reduce<Event[]>((prev, event, arr) => {
    if (prev.find((e) => e.id === event.id)) {
      return prev;
    }
    return [...prev, event];
  }, []);
};

const availableResourceTypes = [
  { label: "Pods", value: "pod" },
  { label: "HPA", value: "hpa" },
];

const availableLimitOptions = [
  { label: "10 events", value: 10 },
  { label: "20 events", value: 20 },
  { label: "50 events", value: 50 },
];

type Props = {
  selectEvent: (e: Event) => void;
  controllers?: EventController[];
};

const EventsList: React.FC<Props> = ({ selectEvent, controllers = [] }) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const [isLoading, setIsLoading] = useState(false);

  const [eventList, setEventList] = useState<Event[]>([]);

  // Filters
  const [currentResourceType, setCurrentResourceType] = useState(
    availableResourceTypes[0]
  );
  const [currentLimit, setCurrentLimit] = useState(availableLimitOptions[0]);
  const [currentController, setCurrentController] = useState<{
    label: string;
    value: EventController;
  }>();

  const availableControllers = useMemo(() => {
    return controllers.map((c) => ({
      label: c.name,
      value: c,
    }));
  }, [controllers]);

  // Fetch Events

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);
    let ownerData: {} | { owner_name: string; owner_type: string } = {};
    if (controllers.length) {
      const c = currentController?.value || controllers[0];
      ownerData = {
        owner_name: c.name,
        owner_type: c.type,
      };
    }

    api
      .getEvents(
        "<token>",
        {
          limit: currentLimit.value,
          skip: eventList.length,
          type: currentResourceType.value as any,
          sort_by: "timestamp",
          ...ownerData,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }
        const newEvents = res.data as Event[];
        setEventList((oldEvents) =>
          removeDuplicatedEvents([...oldEvents, ...newEvents])
        );
      })
      .catch((error) => {
        if (!isSubscribed) {
          return;
        }
        setEventList([]);
        setCurrentError((error as Error)?.message || JSON.stringify(error));
      })
      .finally(() => {
        if (!isSubscribed) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [controllers, currentController, currentResourceType, currentLimit]);

  const handleSelectEvent = (id: number) => {
    const event = mockData.find((e) => e.id === id);
    selectEvent(event);
  };

  return (
    <>
      <ControlRow>
        <Dropdown
          selectedOption={currentResourceType}
          options={availableResourceTypes}
          onSelect={(o) =>
            setCurrentResourceType({ ...o, value: o.value as string })
          }
        />
        <RightFilters>
          {!!controllers.length && (
            <Dropdown
              selectedOption={currentController || availableControllers[0]}
              options={availableControllers}
              onSelect={(o) =>
                setCurrentController({
                  ...o,
                  value: o.value as EventController,
                })
              }
            />
          )}
          <Dropdown
            selectedOption={currentLimit}
            options={availableLimitOptions}
            onSelect={(o) =>
              setCurrentLimit({ ...o, value: o.value as number })
            }
          />
        </RightFilters>
      </ControlRow>
      {isLoading && (
        <Placeholder>
          <div>
            <Header>
              <Spinner src={loadingSrc} />
            </Header>
          </div>
        </Placeholder>
      )}
      {false && !isLoading && !eventList.length && (
        <Placeholder>
          <div>
            <Header>No events to show :(</Header>
            There are no events to show yet, try with another controller or
            later!
          </div>
        </Placeholder>
      )}
      <EventsGrid>
        {mockData.map((event) => {
          return (
            <EventCard
              key={event.id}
              event={event}
              selectEvent={handleSelectEvent}
            />
          );
        })}
      </EventsGrid>
    </>
  );
};

export default EventsList;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const RightFilters = styled.div`
  display: flex;
  > div {
    :not(:last-child) {
      margin-right: 15px;
    }
  }
`;

const Placeholder = styled.div`
  min-height: 200px;
  height: 10vh;
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

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;
