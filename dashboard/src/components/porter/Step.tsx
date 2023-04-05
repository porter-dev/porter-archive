import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  number: number;
  children: any;
};

const Step: React.FC<Props> = ({
  number,
  children
}) => {  
  return (
    <StyledStep>
      <StepNumber>{number}</StepNumber>
      {children}
    </StyledStep>
  );
};

export default Step;

const StepNumber = styled.div`
  height: 20px;
  min-width: 20px;
  max-width: 20px;
  margin-right: 15px;
  background-color: #ffffff22;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 0;
  top: 0;
`;

const StyledStep = styled.div<{ 
}>`
  font-size: 13px;
  position: relative;
  padding-left: 35px;
  display: flex;
  align-items: center;
  line-height: 1.5;
`;