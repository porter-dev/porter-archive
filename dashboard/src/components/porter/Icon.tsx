import React from "react";
import styled from "styled-components";

type Props = {
  src: any;
  height?: string;
};

const Icon: React.FC<Props> = ({
  src,
  height,
}) => {
  return (
    <StyledIcon src={src} height={height} />
  );
};

export default Icon;

const StyledIcon = styled.img<{ height?: string}>`
  height: ${props => props.height || "20px"};
`;