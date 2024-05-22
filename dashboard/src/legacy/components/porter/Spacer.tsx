import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  height?: string;
  width?: string;
  y?: number;
  x?: number;
  inline?: boolean;
};

const Spacer: React.FC<Props> = ({
  height,
  width,
  y,
  x,
  inline,
}) => {
  const getCalcHeight = () => {
    if (y) {
      return 25 * y + "px";
    }
    return null
  };

  const getCalcWidth = () => {
    if (x) {
      return 15 * x + "px";
    }
    return "15px";
  };
  
  return (
    <StyledSpacer
      height={height || getCalcHeight()}
      width={inline && (width || getCalcWidth())}
      inline={inline}
    />
  );
};

export default Spacer;

const StyledSpacer = styled.div<{ 
  height: string;
  width: string;
  inline: boolean;
}>`
  display: ${props => props.inline ? "inline-block" : "block"};
  height: ${props => props.height || "100%"};
  width: ${props => props.height ? "100%" : props.width};
`;