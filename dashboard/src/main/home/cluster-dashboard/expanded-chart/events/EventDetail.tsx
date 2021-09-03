import React, { Fragment } from "react";
import { EventContainer } from "./EventsTab";
import TitleSection from "components/TitleSection";
import EventCard, { getReadableDate } from "./EventCard";
import styled from "styled-components";

interface Props {
  container: EventContainer;
  resetSelection: () => {};
}

const EventDetail: React.FC<Props> = (props) => {
  return (
    <>
      <Flex>
      <TitleSection handleNavBack={props.resetSelection}>
        {props.container.name}
      </TitleSection>
      <P>
        <i className="material-icons-outlined">access_time</i>
        {getReadableDate(props.container.started_at)}
      </P>
      </Flex>
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

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const P = styled.p`
  display: flex;
  align-items: center;
  color: #ffffff44;
  font-size: 13px;
  margin-left: 20px;
  margin-top: 0px;

  > i {
    margin-right: 5px;
    font-size: 18px;
    margin-left: -1px;
  }
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 16px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
    margin-left: -2px;
  }
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;
