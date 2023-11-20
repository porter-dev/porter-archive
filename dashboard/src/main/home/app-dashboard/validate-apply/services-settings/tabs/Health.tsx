import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Checkbox from "components/porter/Checkbox";
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

  return (
    <>
      <Spacer y={1} />
      <Text>
        <>
          <span>Health checks</span>
          <a
            href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
            target="_blank"
            rel="noreferrer"
          >
            &nbsp;(?)
          </a>
        </>
      </Text>
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
          <Spacer y={0.5} />
          <ControlledInput
            type="text"
            label="Health Check Endpoint "
            placeholder="ex: /healthz"
            {...register(
              `app.services.${index}.config.healthCheck.httpPath.value`
            )}
          />
        </>
      )}
    </>
  );
};

export default Health;
