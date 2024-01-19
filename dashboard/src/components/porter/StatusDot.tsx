import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

type StatusDotProps = {
  status: "available" | "pending" | "failing";
  heightPixels?: number;
};

const StatusDot: React.FC<StatusDotProps> = ({ status, heightPixels = 7 }) => {
  const color = useMemo(() => {
    return match(status)
      .with("available", () => "#38a88a")
      .with("pending", () => "#FFA500")
      .with("failing", () => "#ff0000")
      .exhaustive();
  }, [status]);
  return <StyledStatusDot color={color} height={heightPixels} />;
};

export default StatusDot;

const StyledStatusDot = styled.div<{ color: string; height: number }>`
  min-width: ${(props) => props.height}px;
  max-width: ${(props) => props.height}px;
  height: ${(props) => props.height}px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${(props) => props.color};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;
