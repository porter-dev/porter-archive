import React from "react";
import styled from "styled-components";
import Container from "./Container";

type Props = {
  children: React.ReactNode;
  row?: boolean;
  column?: boolean;
  spaced?: boolean;
  alignItems?: string;
  style?: React.CSSProperties;
};

const Clickable: React.FC<Props> = ({
  children,
  style,
}) => {
  return (
    <StyledClickable style={style}>
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
`;
