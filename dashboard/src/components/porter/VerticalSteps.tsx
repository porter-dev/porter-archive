import React, { useEffect, useState } from "react";
import styled from "styled-components";

type Props = {
  steps: React.ReactNode[];
  currentStep: number;
};

const VerticalSteps: React.FC<Props> = ({
  steps,
  currentStep,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledVerticalSteps>
      {steps.map((step, i) => {
        return (
          <StepWrapper isActive={i <= currentStep}>
            {
              (i !== steps.length - 1) && (
                <Line isActive={i + 1 <= currentStep} />
              )
            }
            <Dot 
              isActive={i <= currentStep}
            />
            {step}
            {
              i > currentStep && (
                <ReadOnlyOverlay />
              )
            }
          </StepWrapper>
        );
      })}
    </StyledVerticalSteps>
  );
};

export default VerticalSteps;

const ReadOnlyOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 999;
`;

const Line = styled.div<{
  isActive: boolean;
}>`
  width: 1px;
  height: calc(100% + 35px);
  background: ${props => props.isActive ? "#fff" : "#ffffff33"};
  position: absolute;
  left: 4px;
  top: 8px;
`;

const Dot = styled.div<{
  isActive: boolean;
}>`
  width: 9px;
  height: 9px;
  background: ${props => props.isActive ? "#fff" : "#ffffff33"};
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 7px;
`;

const StepWrapper = styled.div<{
  isActive: boolean;
}>`
  padding-left: 22px;
  position: relative;
  margin-bottom: 35px;
  opacity: ${props => props.isActive ? 1 : 0.5};
`;

const StyledVerticalSteps = styled.div<{
}>`
`;