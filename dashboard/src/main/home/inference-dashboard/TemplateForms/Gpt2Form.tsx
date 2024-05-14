import React from "react";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";

const Gpt2Form: React.FC = () => {
  return (
    <VerticalSteps
      currentStep={0}
      steps={[
        <>
          <Text size={16}>Model name</Text>
          <Spacer y={0.5} />
          <Text color="helper">Lowercase letters, numbers, and "-" only.</Text>
          <Spacer height="20px" />
          <ControlledInput
            type="text"
            width="300px"
            placeholder="ex: klara-af-b2"
          />
        </>,
        <Button key={2}>Deploy model</Button>,
      ]}
    />
  );
};

export default Gpt2Form;
