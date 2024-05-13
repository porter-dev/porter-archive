import React from "react";
import styled from "styled-components";

type Props = {
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
};

const I: React.FC<Props> = ({ children, size, style }) => {
  return (
    <StyledI size={size} style={style} className="material-icons">
      {children}
    </StyledI>
  );
};

export default I;

const StyledI = styled.i<{
  size?: number;
}>`
  font-size: ${(props) => props.size || 20}px;
`;
