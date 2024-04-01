// Tooltip.tsx
import React, { useState } from "react";
import styled from "styled-components";

type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "right" | "bottom" | "left";
  hidden?: boolean;
  tooltipContentWidth?: string;
  backgroundColor?: string;
  containerWidth?: string;
};

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
  hidden = false,
  tooltipContentWidth,
  containerWidth,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = (): void => {
    setIsVisible(true);
  };
  const hideTooltip = (): void => {
    setIsVisible(false);
  };

  if (hidden) {
    return <>{children}</>;
  }

  return (
    <TooltipContainer
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      width={containerWidth}
    >
      {isVisible && (
        <TooltipContent position={position} width={tooltipContentWidth}>
          {content}
        </TooltipContent>
      )}
      {children}
    </TooltipContainer>
  );
};

export default Tooltip;

const TooltipContainer = styled.div<{ width?: string }>`
  position: relative;
  display: inline-flex;
  ${({ width }) => width && `width: ${width};`}
  height: 100%;
`;

const TooltipContent = styled.div<{ position: string; width?: string }>`
  color: #fff;
  padding: 10px;
  border-radius: 5px;
  font-size: 13px;
  position: absolute;
  z-index: 10;
  max-width: ${({ width }) => width ?? "200px"};
  width: ${({ width }) => width ?? "200px"};
  text-align: center;
  white-space: pre-wrap;
  border: 1px solid #494b4f;
  background: #42444933;
  backdrop-filter: saturate(150%) blur(8px);
  animation: fadeInModal 0.5s 0s;
  @keyframes fadeInModal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

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
          top: 70%;
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
