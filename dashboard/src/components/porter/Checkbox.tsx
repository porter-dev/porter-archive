import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  checked: boolean;
  toggleChecked: () => void;
  children: React.ReactNode;
};

const Checkbox: React.FC<Props> = ({
  checked,
  toggleChecked,
  children,
}) => {
  return (
    <StyledCheckbox>
      <Box 
        checked={checked}
        onClick={toggleChecked}
      >
        <i className="material-icons">done</i>
      </Box>
      {children}
    </StyledCheckbox>
  );
};

export default Checkbox;

const StyledCheckbox = styled.div`
  display: flex;
  align-items: center;
`;

const Box = styled.div<{ checked: boolean }>`
  width: 12px;
  height: 12px;
  cursor: pointer;
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