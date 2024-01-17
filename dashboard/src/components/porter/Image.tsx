import React from "react";
import styled from "styled-components";

type Props = {
  src: string | undefined;
  size?: number;
  opacity?: number;
  additionalStyles?: string;
};

const Icon: React.FC<Props> = ({
  src,
  size,
  opacity,
  additionalStyles,
}) => {
  return (
    <StyledIcon
      src={src}
      size={size}
      opacity={opacity}
      additionalStyles={additionalStyles}
    />
  );
};

export default Icon;

const StyledIcon = styled.img<{
  size?: number;
  opacity?: number;
  additionalStyles?: string;
}>`
  height: ${props => props.size || 20}px;
  opacity: ${props => props.opacity || 1};
  ${props => props.additionalStyles ? props.additionalStyles : ""}
`;