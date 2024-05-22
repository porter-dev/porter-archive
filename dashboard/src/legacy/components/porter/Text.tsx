import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  size?: number;
  color?: string;
  weight?: number;
  children: React.ReactNode;
  additionalStyles?: string;
  truncate?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
};

const Text: React.FC<Props> = ({
  size,
  weight,
  color,
  children,
  additionalStyles,
  truncate, // added this
  onClick,
  style,
}) => {
  const getColor = () => {
    switch (color) {
      case "helper":
        return "#9999aa";
      case "warner":
        return "#ff5a52";
      default:
        return color;
    }
  };

  return (
    <StyledText
      size={size}
      color={getColor()}
      weight={weight}
      additionalStyles={additionalStyles}
      truncate={truncate}
      onClick={onClick}
      style={style}
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
  additionalStyles?: string;
  truncate?: boolean;
}>`
  line-height: 1.5;
  font-weight: ${props => props.weight || 400};
  color: ${props => props.color || props.theme.text.primary};
  font-size: ${props => props.size || 13}px;
  display: inline;
  align-items: center;
  user-select: text;
  ${props => props.additionalStyles ? props.additionalStyles : ""}

  ${props =>
    props.truncate
      ? `
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 90%; 
      `
      : ""}
`;
