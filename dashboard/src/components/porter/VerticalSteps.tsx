import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AnimateHeight from "react-animate-height";
import Button from "./Button";
import Spacer from "./Spacer";
import Container from "./Container";

import check from "assets/check.png";

type Props = {
  steps: React.ReactNode[];
  currentStep: number;
  onlyShowCurrentStep?: boolean;
};

const VerticalSteps: React.FC<Props> = ({
  steps,
  currentStep,
  onlyShowCurrentStep,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledVerticalSteps>
      <Line />
      {steps.map((step, i) => {
        return (
          <Relative key={i}>
            {i === steps.length - 1 && (
              <LineCover />
            )}
            {onlyShowCurrentStep && i < currentStep ? (
              <Check src={check} />
            ) : (
              <Dot isActive={i <= currentStep}>
                <Number>{i+1}</Number>
              </Dot>
            )}
            <StepWrapper
              height={onlyShowCurrentStep ? (i === currentStep ? "auto" : 30) : "auto"}
              isLast={i === steps.length - 1}
              key={i}
            >
              <OpacityWrapper isActive={i <= currentStep}>
                {step}
                {i > currentStep && (
                  <ReadOnlyOverlay />
                )}
              </OpacityWrapper>
            </StepWrapper>
          </Relative>
        );
      })}
    </StyledVerticalSteps>
  );
};

export default VerticalSteps;

const LineCover = styled.div`
  width: 10px;
  height: 100%;
  position: absolute;
  left: -4px;
  top: 0;
  background: #121212;
`;

const Relative = styled.div`
  position: relative;
`;

const Check = styled.img`
  height: 26px;
  border-radius: 50%;
  position: absolute;
  left: -8px;
  top: -2px;
  opacity: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #121212;
  padding: 8px;
`;

const Number = styled.div`
  font-size: 12px;
  color: #fff;
`;

const ReadOnlyOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 999;
`;

const Line = styled.div<{
  isActive?: boolean;
}>`
  width: 1px;
  height: calc(100% - 10px);
  background: #414141;
  position: absolute;
  left: 4px;
  opacity: 1;
`;

const Dot = styled.div<{
  isActive: boolean;
}>`
  width: 31px;
  height: 31px;
  background: ${props => props.isActive ? "#3D48C3" : "#121212"};
  border-radius: 50%;
  position: absolute;
  left: -11px;
  top: -3px;
  opacity: 1;
  border: 6px solid #121212;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const OpacityWrapper = styled.div<{
  isActive: boolean;
}>`
  opacity: ${props => props.isActive ? 1 : 0.5};
`;

const StepWrapper = styled(AnimateHeight)<{
  isLast: boolean;
}>`
  padding-left: 30px;
  position: relative;
  margin-bottom: ${props => props.isLast ? "" : "35px"};
`;

const StyledVerticalSteps = styled.div<{
}>`
  position: relative;
  margin-left: 8px;
`;