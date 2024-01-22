import React from "react";
import styled from "styled-components";

type Props = {
  src: string | undefined;
  size?: number;
  opacity?: number;
  additionalStyles?: string;
  style?: React.CSSProperties;
};

const Icon: React.FC<Props> = ({
  src,
  size,
  opacity,
  additionalStyles,
  style,
}) => {
  return (
    <StyledIcon
      src={src}
      size={size}
      opacity={opacity}
      additionalStyles={additionalStyles}
      style={style}
    />
  );
};

export default Icon;

const StyledIcon = styled.img<{
  size?: number;
  opacity?: number;
  additionalStyles?: string;
}>`
  height: ${(props) => props.size || 20}px;
  opacity: ${(props) => props.opacity || 1};
  ${(props) => (props.additionalStyles ? props.additionalStyles : "")}
`;
