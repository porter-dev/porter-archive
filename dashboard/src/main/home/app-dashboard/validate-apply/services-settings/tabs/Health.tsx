import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import { ClientService } from "lib/porter-apps/services";
import React from "react";
import AnimateHeight from "react-animate-height";
import { Controller, useFormContext } from "react-hook-form";

type HealthProps = {
  index: number;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
};

const Health: React.FC<HealthProps> = ({ index, service }) => {
  const { register, control } = useFormContext<PorterAppFormData>();

  return (
    <>
      <Spacer y={1} />
      <Text color="helper">
        <>
          <span>Health checks</span>
          <a
            href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
            target="_blank"
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
            <Text color="helper">Enable Liveness Probe</Text>
          </Checkbox>
        )}
      />
      <AnimateHeight
        height={service.config.healthCheck?.enabled.value ? "auto" : 0}
      >
        <Spacer y={0.5} />
        <ControlledInput
          type="text"
          label="Health Check Endpoint "
          placeholder="ex: /healthz"
          {...register(`app.services.${index}.config.healthCheck.httpPath.value`)}
        />
        <Spacer y={0.5} />
      </AnimateHeight>
    </>
  );
};

export default Health;
