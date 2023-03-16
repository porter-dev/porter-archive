import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

type Props = {
  percent?: number;
  completed?: number;
  total?: number;
};

const LoadingBar: React.FC<Props> = ({
  percent,
  completed,
  total,
}) => {
  return (
    <StyledLoadingBar>
      <LoadingFill 
        percent={(percent || ((100.0 * completed) / total)) + "%"}
      />
    </StyledLoadingBar>
  );
};

export default LoadingBar;

const StyledLoadingBar = styled.div`
  background: #ffffff22;
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 100px;
`;

const movingGradient = keyframes`
  0% {
      background-position: left bottom;
  }

  100% {
      background-position: right bottom;
  }
`;

const LoadingFill = styled.div<{ percent: string }>`
  width: ${props => props.percent};
  background: linear-gradient(to right, #8ce1ff, #616FEE);
  height: 100%;
  background-size: 250% 100%;
  animation: ${movingGradient} 2s infinite;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
`;