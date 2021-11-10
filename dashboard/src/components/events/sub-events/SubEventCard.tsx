import React, { useState } from "react";
import styled from "styled-components";

type CardProps = {
  subEvent: any;
};

const getReadableDate = (s: number) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} ${date}`;
};

const SubEventCard: React.FunctionComponent<CardProps> = ({ subEvent }) => {
  return (
    <StyledCard>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Icon
          status={subEvent.event_type.toLowerCase() as any}
          className="material-icons-outlined"
        >
          {subEvent.event_type.toLowerCase() === "critical"
            ? "report_problem"
            : "info"}
        </Icon>
        <InfoWrapper>
          <div>
            <EventName>Event type: {subEvent.event_type}</EventName>
            <EventReason>Detail: {subEvent.message}</EventReason>
          </div>
        </InfoWrapper>
      </div>
      <TimestampContainer>
        <i className="material-icons-outlined">access_time</i>
        {getReadableDate(subEvent.timestamp)}
      </TimestampContainer>
    </StyledCard>
  );
};

export default SubEventCard;

const StyledCard = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  border: 1px solid #ffffff44;
  background: #ffffff08;
  margin-bottom: 10px;
  border-radius: 10px;
  padding-left: 20px;
  padding-right: 20px;
  overflow: hidden;
  height: 80px;
  cursor: pointer;
  justify-content: space-between;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff66;
  }
`;

const Icon = styled.span<{ status?: "critical" | "normal" }>`
  font-size: 22px;
  margin-right: 18px;
  color: ${({ status }) =>
    status ? (status === "critical" ? "#cc3d42" : "#38a88a") : "#efefef"};
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
  justify-self: flex-end;

  > i {
    margin-right: 5px;
    font-size: 18px;
    margin-left: -1px;
  }
`;

const EventReason = styled.div`
  font-size: 16px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  margin-top: 8px;
`;
