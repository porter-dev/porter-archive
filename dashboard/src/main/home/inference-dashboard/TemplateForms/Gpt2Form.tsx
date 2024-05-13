import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { type Gpt2 } from "lib/models";

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
        <>
          <Text size={16}>Resources</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Configure compute resources for your model. You can change these
            later.
          </Text>
          <Spacer y={0.5} />
          <Text>Replicas</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Configure the number of replicas for your model.
          </Text>
        </>,
        <Button key={2}>Deploy model</Button>,
      ]}
    />
  );
};

export default Gpt2Form;
