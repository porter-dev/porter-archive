import React from "react";
import styled from "styled-components";

type Props = {
  src: any;
  height?: string;
  opacity?: number;
};

const Icon: React.FC<Props> = ({
  src,
  height,
  opacity,
}) => {
  return (
    <StyledIcon src={src} height={height} opacity={opacity} />
  );
};

export default Icon;

const StyledIcon = styled.img<{ 
  height?: string;
  opacity?: number;
}>`
  height: ${props => props.height || "20px"};
  opacity: ${props => props.opacity || 1};
`;