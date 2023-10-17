import React from "react";
import styled from "styled-components";

type Props = {
  items: any[];
  active: string;
  setActive: (active: string) => void;
  activeColor?: string;
  inactiveColor?: string;
};

const Toggle: React.FC<Props> = ({
  items,
  active,
  setActive,
  activeColor,
  inactiveColor,
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
          activeColor={activeColor}
          inactiveColor={inactiveColor}
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

const Item = styled.div<{ active: boolean; activeColor?: string; inactiveColor?: string }>`
  display: flex;
  align-items: center;
  height: 100%;
  cursor: pointer;
  justify-content: center;
  padding: 10px;
  background: ${(props) =>
    props.active ? props.activeColor ?? "#ffffff11" : props.inactiveColor ?? "transparent"};
`;
