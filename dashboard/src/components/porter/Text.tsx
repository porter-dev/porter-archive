import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  size?: number;
  color?: string;
  weight?: number;
  children: any;
};

const Text: React.FC<Props> = ({
  size,
  weight,
  color,
  children
}) => {
  const getColor = () => {
    switch (color) {
      case "helper":
        return "#aaaabb";
      default:
        return color;
    }
  };
  
  return (
    <StyledText
      size={size}
      color={getColor()}
      weight={weight}
    >
      {children}
    </StyledText>
  );
};

export default Text;

const StyledText = styled.div<{ 
  size?: number; 
  color?: string;
  weight?: number;
}>`
  line-height: 1.5;
  font-weight: ${props => props.weight || 400};
  color: ${props => props.color || props.theme.text.primary};
  font-size: ${props => props.size || 13}px;
  display: inline;
  align-items: center;
`;