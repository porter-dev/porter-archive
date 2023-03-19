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
    if (y) {
      return 25 * y + "px";
    }
    return null
  };
  
  return (
    <StyledSpacer
      height={height || getCalcHeight()}
      width={inline && "15px"}
    />
  );
};

export default Spacer;

const StyledSpacer = styled.div<{ 
  height: string;
  width: string;
}>`
  height: ${props => props.height || "100%"};
  width: ${props => props.height ? "100%" : props.width};
`;