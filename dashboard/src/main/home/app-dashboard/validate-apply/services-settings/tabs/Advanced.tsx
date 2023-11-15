import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";
import { type ClientService } from "lib/porter-apps/services";
import React, { useContext, useState } from "react";
import AnimateHeight from "react-animate-height";
import { Controller, useFormContext } from "react-hook-form";
import { Switch } from "@material-ui/core";
import ProvisionClusterModal from "main/home/sidebar/ProvisionClusterModal";
import Loading from "components/Loading";
import healthy from "assets/status-healthy.png";
import styled from "styled-components";
import { Context } from "shared/Context";


type AdvancedProps = {
  index: number;
  clusterContainsGPUNodes: boolean;
  service: ClientService & {
    config: {
      type: "web";
    };
  };
};

const Advanced: React.FC<AdvancedProps> = ({ index, clusterContainsGPUNodes, service }) => {
  const { currentCluster, currentProject } = useContext(Context);
  const { register, control, watch } = useFormContext<PorterAppFormData>();
  const [clusterModalVisible, setClusterModalVisible] = useState<boolean>(false);
  const healthCheckEnabled = watch(
    `app.services.${index}.config.healthCheck.enabled`
  );
  return (
    <>
      <Spacer y={1} />
      <Text color="helper">
        <>
          <span>Health checks</span>
          <a
            href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
            target="_blank" rel="noreferrer"
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
          <Spacer y={0.5} />
        </>
      )}
    </>
  );
};

export default Advanced;

