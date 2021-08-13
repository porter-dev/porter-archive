import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import EventLogs from "components/events/EventLogs";
import EventsList from "components/events/EventsList";
import EventsContextProvider, {
  EventContext,
} from "components/events/EventsContext";

type EventsTabProps = {};

const EventsTab: React.FunctionComponent<EventsTabProps> = () => {
  return (
    <EventsContextProvider controllers={[]} enableNodeEvents={false}>
      <EventContext.Consumer>
        {({ selectedEvent }) => (
          <EventsPageWrapper>
            {!selectedEvent && (
              <>
                <EventsList />
              </>
            )}
            {selectedEvent && (
              <>
                <EventLogs />
              </>
            )}
          </EventsPageWrapper>
        )}
      </EventContext.Consumer>
    </EventsContextProvider>
  );
};

export default EventsTab;

const EventsPageWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;
