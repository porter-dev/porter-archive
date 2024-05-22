import React from "react";
import styled from "styled-components";
import Tooltip from "./Tooltip";

type Props = {
  isToggled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  disabledTooltip?: string;
};

const ToggleRow: React.FC<Props> = ({
  isToggled,
  onToggle,
  children,
  disabled = false,
  disabledTooltip,
}) => {
  return (
    disabled && disabledTooltip ?
      <Tooltip content={disabledTooltip} position="right">
        <StyledToggle>
          <ToggleContainer
            isToggled={isToggled}
            onClick={disabled ? () => { } : onToggle}
            disabled={disabled}
          >
            <ToggleDot />
          </ToggleContainer>
          {children}
        </StyledToggle>
      </Tooltip>
      :
      <StyledToggle>
        <ToggleContainer
          isToggled={isToggled}
          onClick={disabled ? () => { } : onToggle}
          disabled={disabled}
        >
          <ToggleDot />
        </ToggleContainer>
        {children}
      </StyledToggle>
  );
};

export default ToggleRow; 

const StyledToggle = styled.div`
  display: flex;
  align-items: center;
`;

const ToggleDot = styled.div`
  width: 9px;
  height: 9px;
  margin: 2px;
  background: #aaaabb;
  border-radius: 50px;
`;

const ToggleContainer = styled.div<{
  isToggled: boolean;
  disabled?: boolean;
}>`
  width: 30px;
  height: 16px;
  border: 1px solid #ffffff55;
  margin-right: 10px;
  border-radius: 50px;
  background: ${(props) => (props.isToggled ? "#ffffff33" : "#ffffff11")};
  display: flex;
  align-items: center;
  justify-content ${props => props.isToggled ? "flex-end" : "flex-start"};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  :hover {
    border: 1px solid #aaaabb;
  }
`;