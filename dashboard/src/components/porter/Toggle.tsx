import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  items: any[];
  active: string;
  setActive: (active: string) => void;
  highlightColor?: string;
};

const Toggle: React.FC<Props> = ({
  items,
  active,
  setActive,
  highlightColor,
}) => {
  return (
    <StyledToggle>
      {items.map((item, i) => (
        <Item
          key={i}
          active={item.value === active}
          onClick={() => {
            setActive(item.value);
          }}
          highlightColor={highlightColor}
        >
          {item.label}
        </Item>
      ))}
    </StyledToggle>
  );
};

export default Toggle;

const StyledToggle = styled.div`
  display: flex;
  height: 30px;
  background: ${(props) => props.theme.fg};
  border-radius: 5px;
  border: 1px solid #494b4f;
  align-items: center;
`;

const Item = styled.div<{ active: boolean; highlightColor?: string }>`
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  justify-content: center;
  padding: 10px;
  background: ${(props) =>
    props.active ? props.highlightColor ?? "#ffffff11" : "transparent"};
`;
