import { Steps } from "main/home/onboarding/types";
import React, { useState } from "react";

import styled from "styled-components";

type Props = {
  currentStep: string;
  steps: { value: string, label: string }[];
  onClickStep?: (step: string) => void;
};

const Breadcrumb: React.FC<Props> = ({ currentStep, steps, onClickStep }) => {
  return (
    <StyledBreadcrumb>
      {steps.map((step: { value: string, label: string }, i: number) => {
        return (
          <>
          <Crumb
            bold={currentStep === step.value}
            onClick={() => onClickStep && onClickStep(step.value)}
          >
            {step.label}
          </Crumb>
          {i !== steps.length - 1 && " > "}
          </>
        );
      })}
    </StyledBreadcrumb>
  );
};

export default Breadcrumb;

const StyledBreadcrumb = styled.div`
  color: #aaaabb;
`;

const Crumb = styled.span<{ bold: boolean }>`
  font-weight: ${props => props.bold ? "600" : "normal"};
  color: ${props => props.bold ? "#ffffff" : "#aaaabb"};
  font-size: 13px;
`;