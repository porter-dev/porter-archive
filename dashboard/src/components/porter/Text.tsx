import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  size?: number;
  color?: string;
  children: any;
};

const Text: React.FC<Props> = ({
  size,
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
    >
      {children}
    </StyledText>
  );
};

export default Text;

const StyledText = styled.div<{ 
  size?: number; 
  color?: string 
}>`
  color: ${props => props.color || "#ffffff"};
  font-size: ${props => props.size || 13}px;
`;