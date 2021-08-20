import React, { useContext } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import { EventContext } from "./EventsContext";

type EventLogsProps = {};

const EventLogs: React.FunctionComponent<EventLogsProps> = ({}) => {
  const { clearSelectedEvent } = useContext(EventContext);
  return (
    <>
      <ControlRow>
        <div>
          <BackButton onClick={clearSelectedEvent}>
            <BackButtonImg src={backArrow} />
          </BackButton>
        </div>
      </ControlRow>
      <div>Show logs</div>
    </>
  );
};

export default EventLogs;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
`;

const BackButton = styled.div`
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;
