import React from "react";
import styled from "styled-components";
import { Event } from "main/home/cluster-dashboard/expanded-chart/events/EventsTab";

type CardProps = {
  event: Event;
};
const getReadableDate = (s: string) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${date}`;
};

// Rename to Event Card
const Card: React.FunctionComponent<CardProps> = ({ event }) => {
  return (
    <StyledCard>
      <ContentContainer>
        <Icon status={event.event_type} className="material-icons-outlined">
          {event.event_type === "critical" ? "report_problem" : "info"}
        </Icon>
        <EventInformation>
          <EventName>
            <Helper>{event.resource_type}:</Helper>
            {event.name}
          </EventName>
          <EventReason>
            <Helper>Reason:</Helper>
            {event.reason}
          </EventReason>
        </EventInformation>
      </ContentContainer>
      <ActionContainer>
        <span className="material-icons-outlined">access_time</span>
        <span>{getReadableDate(event.timestamp)}</span>
      </ActionContainer>
    </StyledCard>
  );
};

export default Card;

const StyledCard = styled.div`
  background: #26282f;
  min-height: 100px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #26282f;
  box-shadow: 0 4px 15px 0px #00000055;
  border-radius: 8px;
  padding: 14px;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span`
  font-size: 35px;
  margin-right: 14px;
  color: ${({ status }: { status: "critical" | "normal" }) =>
    status === "critical" ? "red" : "green"};
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-size: 14px;
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const Helper = styled.span`
  font-size: 14px;
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const EventReason = styled.div`
  font-size: 18px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  margin-top: 8px;
`;

const ActionContainer = styled.div`
  width: max-content;
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;
