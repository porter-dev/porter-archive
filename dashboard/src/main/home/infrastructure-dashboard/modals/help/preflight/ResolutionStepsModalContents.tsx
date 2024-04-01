import React from "react";
import styled from "styled-components";

import Link from "components/porter/Link";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import Step from "components/porter/Step";
import Text from "components/porter/Text";
import { type PreflightCheckResolution } from "lib/clusters/types";

type Props = {
  resolution: PreflightCheckResolution;
};
const ResolutionStepsModalContents: React.FC<Props> = ({ resolution }) => {
  return (
    <div>
      <Text size={16} weight={500}>
        {resolution.title}
      </Text>
      <Spacer y={1} />
      <Text color="helper">{resolution.subtitle}</Text>
      <Spacer y={1} />
      <StepContainer>
        {resolution.steps.map((step, i) => (
          <Step number={i + 1} key={i}>
            {step.externalLink ? (
              <Link to={step.externalLink} target="_blank" inline={false}>
                {step.text}
              </Link>
            ) : (
              step.text
            )}
          </Step>
        ))}
      </StepContainer>
      <Spacer y={1} />
      <ShowIntercomButton message="I need help resolving preflight check errors.">
        Need help? Talk to support
      </ShowIntercomButton>
    </div>
  );
};

export default ResolutionStepsModalContents;

const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
