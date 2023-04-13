// Tooltip.tsx
import React, { useState } from "react";
import styled from "styled-components";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "right" | "bottom" | "left";
  hidden?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
  hidden = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  if (hidden) {
    return <>{children}</>;
  }

  return (
    <TooltipContainer onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      {isVisible && (
        <TooltipContent position={position}>{content}</TooltipContent>
      )}
      {children}
    </TooltipContainer>
  );
};

export default Tooltip;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipContent = styled.div<{ position: string }>`
  background-color: #333;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  position: absolute;
  z-index: 10;
  max-width: 200px;
  text-align: center;
  white-space: pre-wrap;
  word-wrap: break-word;

  ${({ position }) => {
    switch (position) {
      case "top":
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
        `;
      case "right":
        return `
          top: 50%;
          left: 100%;
          transform: translateY(-50%) translateX(8px);
        `;
      case "bottom":
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
        `;
      case "left":
        return `
          top: 50%;
          right: 100%;
          transform: translateY(-50%) translateX(-8px);
        `;
      default:
        return "";
    }
  }};
`;
