import React, { useState } from "react";
import styled from "styled-components";

type CardProps = {
  subEvent: any;
};

const SubEventCard: React.FunctionComponent<CardProps> = ({ subEvent }) => {
  return (
    <StyledCard status={subEvent.event_type.toLowerCase()}>
      <Icon
        status={subEvent.event_type.toLowerCase() as any}
        className="material-icons-outlined"
      >
        {subEvent.event_type.toLowerCase() === "critical"
          ? "report_problem"
          : "info"}
      </Icon>
      {subEvent.message}
    </StyledCard>
  );
};

export default SubEventCard;

const StyledCard = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid
    ${({ status }) => (status === "critical" ? "#ff385d" : "#ffffff44")};
  background: #ffffff08;
  margin-bottom: 30px;
  border-radius: 10px;
  padding: 14px;
  padding-left: 13px;
  overflow: hidden;
  height: 55px;
  font-size: 13px;
  color: #aaaabb;
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

const Icon = styled.span<{ status: "critical" | "normal" }>`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 13px;
  color: ${({ status }) => (status === "critical" ? "#ff385d" : "#aaaabb")};
`;
