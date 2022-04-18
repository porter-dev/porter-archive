import styled from "styled-components";
import DynamicLink from "components/DynamicLink";
import React, { useState } from "react";

export const EllipsisTextWrapper: React.FC<
  { tooltipText?: string } & React.HTMLAttributes<HTMLDivElement>
> = ({ children, tooltipText, className }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <StyledTooltipWrapper
      className={className}
      onMouseOver={() => setShowTooltip(true)}
      onMouseOut={() => setShowTooltip(false)}
    >
      <StyledEllipsisTextWrapper>{children}</StyledEllipsisTextWrapper>
      {tooltipText && showTooltip ? <Tooltip>{tooltipText}</Tooltip> : null}
    </StyledTooltipWrapper>
  );
};

export const Tooltip = styled.div`
  position: absolute;
  left: -20px;
  top: 10px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
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

const StyledTooltipWrapper = styled.div`
  position: relative;
  overflow: visible;
`;

export const StyledEllipsisTextWrapper = styled.span`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
`;

export const RepoLink = styled(DynamicLink)`
  height: 22px;
  border-radius: 50px;
  margin-left: 6px;
  display: flex;
  font-size: 12px;
  cursor: pointer;
  color: #a7a6bb;
  align-items: center;
  justify-content: center;
  :hover {
    color: #ffffff;
    > i {
      color: #ffffff;
    }
  }

  > i {
    margin-right: 5px;
    color: #a7a6bb;
    font-size: 16px;
  }
`;
