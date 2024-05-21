import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Checkbox from "components/porter/Checkbox";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

type HealthProps = {
  index: number;
};

const Health: React.FC<HealthProps> = ({ index }) => {
  const { register, control, watch } = useFormContext<PorterAppFormData>();

  const healthCheckEnabled = watch(
    `app.services.${index}.config.healthCheck.enabled`
  );

  const serviceType = watch(`app.services.${index}.config.type`);

  return (
    <>
      <Spacer y={1} />
      <Text>Health checks</Text>
      <Spacer y={0.25} />
      <Container style={{ width: "400px" }}>
        <Text color="helper">
          Configure health checks to prevent downtime during deployments
          <a
            href="https://docs.porter.run/configure/health-checks"
            target="_blank"
            rel="noreferrer"
          >
            &nbsp;(?)
          </a>
        </Text>
      </Container>
      <Spacer y={0.5} />
      <Controller
        name={`app.services.${index}.config.healthCheck.enabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value.value}
            toggleChecked={() => {
              onChange({
                ...value,
                value: !value.value,
              });
            }}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
          >
            <Text color="helper">Enable health checks</Text>
          </Checkbox>
        )}
      />
      {healthCheckEnabled.value && (
        <>
          <Spacer y={0.75} />
          {serviceType === "web" ? (
            <>
              <Text color="helper">Endpoint</Text>
              <Spacer y={0.25} />
              <ControlledInput
                type="text"
                placeholder="ex: /healthz"
                {...register(
                  `app.services.${index}.config.healthCheck.httpPath.value`
                )}
              />
            </>
          ) : (
            <>
              <Text color="helper">Command</Text>
              <Spacer y={0.25} />
              <ControlledInput
                type="text"
                placeholder="ex: ./healthz.sh"
                {...register(
                  `app.services.${index}.config.healthCheck.command.value`
                )}
              />
            </>
          )}
          <Spacer y={0.5} />
          <Text color="helper">Timeout (seconds)</Text>
          <Spacer y={0.25} />
          <ControlledInput
            type="text"
            placeholder="ex: 1"
            {...register(
              `app.services.${index}.config.healthCheck.timeoutSeconds.value`
            )}
          />
          <Spacer y={0.5} />
          <Text color="helper">Initial delay (seconds)</Text>
          <Spacer y={0.25} />
          <ControlledInput
            type="text"
            placeholder="ex: 30"
            {...register(
              `app.services.${index}.config.healthCheck.initialDelaySeconds.value`
            )}
          />
        </>
      )}
    </>
  );
};

export default Health;
