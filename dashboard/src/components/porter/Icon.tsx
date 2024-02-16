import React from "react";
import styled from "styled-components";

type Props = {
  src: any;
  height?: string;
  width?: string;
  opacity?: number;
};

const Icon: React.FC<Props> = ({ src, height, width, opacity }) => {
  return (
    <StyledIcon src={src} height={height} opacity={opacity} width={width} />
  );
};

export default Icon;

const StyledIcon = styled.img<{
  height?: string;
  opacity?: number;
}>`
  ${(props) =>
    props.width ? "width: 20px;" : `height: ${props.height || "20px"};`}
  opacity: ${(props) => props.opacity || 1};
`;
