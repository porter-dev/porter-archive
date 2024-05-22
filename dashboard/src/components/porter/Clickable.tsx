import React from "react";
import styled from "styled-components";


type Props = {
  children: React.ReactNode;
  row?: boolean;
  column?: boolean;
  spaced?: boolean;
  alignItems?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
};

const Clickable: React.FC<Props> = ({ children, style, onClick }) => {
  return (
    <StyledClickable onClick={onClick} style={style}>
      {children}
    </StyledClickable>
  );
};

export default Clickable;

const StyledClickable = styled.div`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  :hover {
    border: 1px solid #7a7b80;
  }
  display: flex;
  align-items: center;
`;
