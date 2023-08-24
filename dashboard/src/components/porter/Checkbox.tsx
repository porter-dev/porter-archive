import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Tooltip from "./Tooltip";

type Props = {
  checked: boolean;
  toggleChecked: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  disabledTooltip?: string;
};

const Checkbox: React.FC<Props> = ({
  checked,
  toggleChecked,
  children,
  disabled = false,
  disabledTooltip,
}) => {
  return (
    disabled && disabledTooltip ?
      <Tooltip content={disabledTooltip} position="right">
        <StyledCheckbox 
          onClick={disabled ? () => { } : toggleChecked}
          disabled={disabled}
        >
          <Box checked={checked}>
            <i className="material-icons">done</i>
          </Box>
          {children}
        </StyledCheckbox>
      </Tooltip>
      :
      <StyledCheckbox 
        onClick={disabled ? () => { } : toggleChecked}
        disabled={disabled}
      >
        <Box checked={checked}>
          <i className="material-icons">done</i>
        </Box>
        {children}
      </StyledCheckbox>
  );
};

export default Checkbox;

const StyledCheckbox = styled.div<{
  disabled?: boolean;
}>`
  display: flex;
  align-items: center;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
`;

const Box = styled.div<{
  checked: boolean;
}>`
  width: 12px;
  height: 12px;
  border: 1px solid #ffffff55;
  margin-right: 10px;
  border-radius: 3px;
  background: ${(props) => (props.checked ? "#ffffff22" : "#ffffff11")};
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 12px;
    padding-left: 0px;
    display: ${(props) => (props.checked ? "" : "none")};
  }
`;