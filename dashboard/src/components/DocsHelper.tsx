import React from "react";
import styled from "styled-components";

import { ClickAwayListener } from "@material-ui/core";

type Props = {
  tooltipText: string;
  link?: string;
  placement?: TooltipPlacement;
  disableMargin?: boolean;
};

const DocsHelper: React.FC<Props> = ({
  tooltipText,
  link,
  placement,
  disableMargin,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const handleTooltipToggle = () => {
    setOpen(!open);
  };

  return (
    <DocsHelperContainer disableMargin={disableMargin}>
      <ClickAwayListener
        onClickAway={() => {
          handleTooltipClose();
        }}
      >
        <div>
          <HelperButton onClick={handleTooltipToggle}>
            <i className="material-icons">help_outline</i>
          </HelperButton>
          {open && (
            <Tooltip placement={placement}>
              <StyledContent onClick={handleTooltipOpen}>
                {tooltipText}
                {link && (
                  <A target="_blank" href={link}>
                    Documentation {">"}
                  </A>
                )}
              </StyledContent>
            </Tooltip>
          )}
        </div>
      </ClickAwayListener>
    </DocsHelperContainer>
  );
};

export default DocsHelper;

type TooltipPlacement = "top-end" | "bottom-end" | "top-start" | "bottom-start";

const Tooltip = styled.div<{ placement: TooltipPlacement }>`
  position: absolute;
  ${({ placement }) => {
    switch (placement) {
      case "top-start":
        return `
          bottom: 25px;
          left: 0px;
        `;
      case "bottom-end":
        return `
          top: 25px;
          right: 0px;
        `;
      case "bottom-start":
        return `
          top: 25px;
          left: 0px;
        `;
      case "top-end":
      default:
        return `
          bottom: 25px;
          right: 0px;
        `;
    }
  }}
  word-wrap: break-word;
  min-height: 18px;
  width: fit-content;
  padding: 5px 7px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  color: white;
  text-transform: none;
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

const StyledContent = styled.div`
  font-family: "Work Sans", sans-serif;
  font-size: 12px;
  font-weight: normal;
  padding: 12px 14px;
  line-height: 1.5em;
  user-select: text;
  width: max-content;
  max-width: 300px;
  height: calc(100% + 10px);
  margin-left: -7px;
  height: 100%;
  background: #2e3135;
  border: 1px solid #aaaabb;
  border-radius: 5px;
`;

const HelperButton = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-left: 10px;
  justify-content: center;
  > i {
    color: #aaaabb;
    width: 24px;
    height: 24px;
    font-size: 20px;
    border-radius: 20px;
  }
`;

const A = styled.a`
  display: inline-block;
  height: 20px;
  color: #8590ff;
  text-decoration: underline;
  cursor: pointer;
  margin-top: 10px;
  width: 100%;
  text-align: right;
  user-select: none;
`;

const DocsHelperContainer = styled.div<{ disableMargin: boolean }>`
  ${(props) => {
    if (props.disableMargin) {
      return "";
    }
    return `margin-left: auto;`;
  }}
  position: relative;
`;
