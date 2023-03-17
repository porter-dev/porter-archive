import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  height?: string;
  y?: number;
  inline?: boolean;
};

const Spacer: React.FC<Props> = ({
  height,
  y,
  inline,
}) => {
  const getCalcHeight = () => {
    return 25 * y;
  };
  
  return (
    <StyledSpacer
      height={height || (getCalcHeight() + "px")}
    />
  );
};

export default Spacer;

const StyledSpacer = styled.div<{ height: string }>`
  height: ${props => props.height};
  width: ${props => props.height ? "100%" : ""};
`;