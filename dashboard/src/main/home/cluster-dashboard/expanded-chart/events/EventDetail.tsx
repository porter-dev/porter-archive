import React, { Fragment } from "react";
import { EventContainer } from "./EventsTab";
import EventCard, { getReadableDate } from "./EventCard";
import styled from "styled-components";

interface Props {
  container: EventContainer;
  resetSelection: () => {};
}

const EventDetail: React.FC<Props> = (props) => {
  return (
    <>
      <button onClick={() => props.resetSelection()}>← Back button</button>
      <h1>{props.container.name}</h1>
      <p>Started at {getReadableDate(props.container.started_at)}</p>
      <EventsGrid>
        {props.container.events
          .slice(0)
          .reverse()
          .map((event) => {
            return (
              <React.Fragment key={event.index}>
                <EventCard event={event} />
              </React.Fragment>
            );
          })}
      </EventsGrid>
    </>
  );
};

export default EventDetail;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
