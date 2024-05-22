import React from "react";
import Container from "legacy/components/porter/Container";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import { useFormContext } from "react-hook-form";

type AdvancedProps = {
  index: number;
};

const Advanced: React.FC<AdvancedProps> = ({ index }) => {
  const { register } = useFormContext<PorterAppFormData>();

  return (
    <>
      <Text>Termination grace period (seconds)</Text>
      <Spacer y={0.25} />
      <Container style={{ width: "400px" }}>
        <Text color="helper">
          Specify how much time service processes are given to gracefully shut
          down when they receive SIGTERM
          <a
            href="https://docs.porter.run/configure/zero-downtime-deployments#graceful-shutdown"
            target="_blank"
            rel="noreferrer"
          >
            &nbsp;(?)
          </a>
        </Text>
      </Container>
      <Spacer y={0.25} />
      <ControlledInput
        type="text"
        placeholder="ex: 30"
        {...register(
          `app.services.${index}.terminationGracePeriodSeconds.value`
        )}
      />
      <Spacer y={0.5} />
    </>
  );
};

export default Advanced;
