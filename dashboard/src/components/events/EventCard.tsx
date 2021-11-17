import React, { useState } from "react";
import styled from "styled-components";

type CardProps = {
  event: any;
  selectEvent?: (event: any) => void;
  overrideName?: string;
};

export const getReadableDate = (s: string) => {
  let ts = new Date(s);
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
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <>
      <StyledCard
        onClick={() => selectEvent(event)}
        status={event.event_type.toLowerCase()}
      >
        <ContentContainer>
          <Icon
            status={event.event_type.toLowerCase() as any}
            className="material-icons-outlined"
          >
            {event.event_type === "critical" ? "report_problem" : "info"}
          </Icon>
          <EventInformation>
            <EventName>
              <Helper>{event.resource_type}:</Helper>
              {event.name}
            </EventName>
            <EventReason>{event.last_message}</EventReason>
          </EventInformation>
        </ContentContainer>
        <ActionContainer>
          <TimestampContainer>
            <TimestampIcon className="material-icons-outlined">
              access_time
            </TimestampIcon>
            <span>{getReadableDate(event.timestamp)}</span>
          </TimestampContainer>
        </ActionContainer>
      </StyledCard>
    </>
  );
};

export default EventCard;

const StyledCard = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid
    ${({ status }) => (status === "critical" ? "#ff385d" : "#ffffff44")};
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
  font-size: 13px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    border: 1px solid
      ${({ status }) => (status === "critical" ? "#ff385d" : "#ffffff66")};
  }
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

const Icon = styled.span<{ status: "critical" | "normal" }>`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 20px;
  color: ${({ status }) => (status === "critical" ? "#ff385d" : "#aaaabb")};
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const Helper = styled.span`
  text-transform: capitalize;
  color: #ffffff44;
  margin-right: 5px;
`;

const EventReason = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  margin-top: 5px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const HistoryButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: #ffffff44;
  :hover {
    background: #32343a;
    cursor: pointer;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  left: 0px;
  word-wrap: break-word;
  top: 38px;
  min-height: 18px;
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TimestampContainer = styled.div`
  display: flex;
  white-space: nowrap;
  align-items: center;
  justify-self: flex-end;
  color: #ffffff55;
  margin-right: 10px;
  font-size: 13px;
  min-width: 130px;
  justify-content: space-between;
`;

const TimestampIcon = styled.span`
  margin-right: 7px;
  font-size: 18px;
`;
