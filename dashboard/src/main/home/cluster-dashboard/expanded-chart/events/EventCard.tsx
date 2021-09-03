import React, { useState } from "react";
import styled from "styled-components";
import { Event } from "./EventsTab";
import Loading from "../../../../../components/Loading";

type CardProps = {
  event: Event;
  selectEvent?: () => void;
  overrideName?: string;
};

export const getReadableDate = (s: number) => {
  let ts = new Date(s * 1000);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${date}`;
};

// Rename to Event Card
const EventCard: React.FunctionComponent<CardProps> = ({
  event,
  selectEvent,
  overrideName,
}) => {
  return (
    <StyledCard onClick={() => selectEvent && selectEvent()}>
      {event.status == 1 && (
        <Icon status="normal" className="material-icons-outlined">
          check
        </Icon>
      )}
      {event.status == 2 && (
        <Icon className="material-icons-outlined">
          autorenew
        </Icon>
      )}
      {event.status == 3 && (
        <Icon status="critical" className="material-icons-outlined">
          error
        </Icon>
      )}
       
      <InfoWrapper>
        <EventName>
          {overrideName ? overrideName : event.name}
          {event.status == 1 && " successful"}
          {event.status == 2 && " in progress"}
          {event.status == 3 && ` failed: ${event.info}`}
        </EventName>
        <TimestampContainer>
          <i className="material-icons-outlined">access_time</i>
          {getReadableDate(event.time)}
        </TimestampContainer>
      </InfoWrapper>
    </StyledCard>
  );
};

export default EventCard;

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  margin-bottom: 10px;
  border-radius: 10px;
  padding-left: 20px;
  overflow: hidden;
  height: 80px;
  cursor: pointer;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff66;
  }
`;

const Icon = styled.span<{ status?: "critical" | "normal" }>`
  font-size: 22px;
  margin-right: 18px;
  color: ${({ status }) => status ? (status === "critical" ? "#cc3d42" : "#38a88a" ) : "#efefef"};
  animation: ${({ status }) => !status && "rotating 3s linear infinite"};
  @keyframes rotating {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const EventName = styled.div`
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const TimestampContainer = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff55;
  font-size: 13px;
  margin-top: 8px;

  > i {
    margin-right: 5px;
    font-size: 18px;
    margin-left: -1px;
  }
`;
