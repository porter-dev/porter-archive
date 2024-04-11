import React from "react";
import styled from "styled-components";

import Container from "./Container";
import Tooltip from "./Tooltip";

type Props = {
  name: string;
  label?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
  height?: string;
};

const ControlledCheckbox: React.FC<Props> = ({
  name,
  label,
  checked,
  onChange,
  disabled = false,
  disabledTooltip,
}) => {
  return disabled && disabledTooltip ? (
    <Tooltip content={disabledTooltip} position="right">
      <Container row>
        <StyledCheckbox
          onClick={disabled ? () => {} : onChange}
          disabled={disabled}
        >
          <Box checked={checked}>
            <i className="material-icons">done</i>
            <input
              type="checkbox"
              name={name}
              checked={checked}
              onChange={onChange}
              disabled={disabled}
            />
          </Box>
        </StyledCheckbox>
        {label && <Label>{label}</Label>}
      </Container>
    </Tooltip>
  ) : (
    <Container row>
      <StyledCheckbox
        onClick={disabled ? () => {} : onChange}
        disabled={disabled}
      >
        <Box checked={checked}>
          <i className="material-icons">done</i>
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
          />
        </Box>
      </StyledCheckbox>
      {label && <Label>{label}</Label>}
    </Container>
  );
};

export default ControlledCheckbox;

const StyledCheckbox = styled.div<{
  disabled?: boolean;
}>`
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

  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }

  input:checked + i {
    display: block;
  }
`;

const Label = styled.div`
  font-size: 13px;
  color: #aaaabb;
  margin-bottom: 10px;
`;
