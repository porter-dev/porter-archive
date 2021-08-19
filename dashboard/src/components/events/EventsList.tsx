import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Dropdown from "components/Dropdown";
import { EventContext } from "./EventsContext";
import EventCard from "./EventCard";

const EventsList: React.FunctionComponent = ({}) => {
  const {
    eventList,
    selectEvent,
    setResourceType,
    setLimit,
    availableControllers,
    setSelectedController,
    enableNodeEvents,
  } = useContext(EventContext);

  const handleResourceTypeSelection = (option: {
    label: string;
    value: "pod" | "hpa";
  }) => {
    setResourceType(option.value);
  };

  const handleSetLimit = (option: { label: string; value: number }) => {
    setLimit(option.value);
  };

  const handleControllerSelection = (option: {
    label: string;
    value: { type: string; name: string };
  }) => {
    setSelectedController(option.value);
  };

  const resourceTypes = useMemo(() => {
    if (enableNodeEvents) {
      return [
        { label: "Pods", value: "pod" },
        { label: "HPA", value: "hpa" },
        { label: "Node", value: "node" },
      ];
    }
    return [
      { label: "Pods", value: "pod" },
      { label: "HPA", value: "hpa" },
    ];
  }, [enableNodeEvents]);

  const controllers = useMemo(() => {
    return availableControllers.map((c) => ({
      label: c.name,
      value: c,
    }));
  }, [availableControllers]);

  return (
    <div>
      <ControlRow>
        <Dropdown
          options={resourceTypes}
          onSelect={handleResourceTypeSelection}
        />
        <RightFilters>
          <Dropdown
            options={[
              { label: "10 events", value: 10 },
              { label: "20 events", value: 20 },
              { label: "50 events", value: 50 },
            ]}
            onSelect={handleSetLimit}
          />
          <Dropdown
            options={controllers}
            onSelect={handleControllerSelection}
          />
        </RightFilters>
      </ControlRow>
      <EventsGrid>
        {eventList.map((event) => {
          return (
            <EventCard key={event.id} event={event} selectEvent={selectEvent} />
          );
        })}
      </EventsGrid>
    </div>
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
