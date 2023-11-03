import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import { ClientService } from "lib/porter-apps/services";
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
  const { currentCluster } = useContext(Context);
  const { register, control, watch } = useFormContext<PorterAppFormData>();
  const [clusterModalVisible, setClusterModalVisible] = useState<boolean>(false);
  const healthCheckEnabled = watch(
    `app.services.${index}.config.healthCheck.enabled`
  );

  const gpuEnabledValue = watch(
    `app.services.${index}.gpuCoresNvidia`, {
    readOnly: false,
    value: 0
  }
  );

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

      <>
        <Spacer y={1} />
        <Controller
          name={`app.services.${index}.gpuCoresNvidia`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <><Switch
              size="small"
              color="primary"
              checked={value.value > 0}
              onChange={() => {
                if (!clusterContainsGPUNodes && !(value.value > 0)) {
                  setClusterModalVisible(true);

                } else {
                  onChange({
                    ...value,
                    value: .5
                  });
                }
              }}
              inputProps={{ 'aria-label': 'controlled' }} /><Spacer inline x={.5} /><Text color="helper">
                <>
                  <span>Enable GPU</span>
                  <a
                    href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
                    target="_blank"
                  >
                    &nbsp;(?)
                  </a>
                </>
              </Text><Spacer y={.5} /></>
          )} />
        {gpuEnabledValue.value > 0 &&
          <>
            {(currentCluster.status == "UPDATING" && currentCluster?.gpuCluster) ?
              (< CheckItemContainer >
                <CheckItemTop >
                  <Loading
                    offset="0px"
                    width="20px"
                    height="20px" />
                  <Spacer inline x={1} />
                  <Text style={{ marginLeft: '10px', flex: 1 }}>{"Creating GPU nodes..."}</Text>
                </CheckItemTop>
              </CheckItemContainer>
              )
              :
              (<CheckItemContainer >
                <CheckItemTop >
                  <StatusIcon src={healthy} />
                  <Spacer inline x={1} />
                  <Text style={{ marginLeft: '10px', flex: 1 }}>{"Service running on GPU workload "}</Text>
                </CheckItemTop>
              </CheckItemContainer>
              )}
          </>
        }

      </>
      {
        clusterModalVisible && <ProvisionClusterModal
          closeModal={() => setClusterModalVisible(false)}
          gpuModal={true}
        />
      }

    </>
  );
};

export default Advanced;


const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${props => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${props => (props.hasMessage ? 'pointer' : 'default')};
  background: ${props => props.theme.clickable.bg};

`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${props => props.theme.clickable.bg};
`;

const StatusIcon = styled.img`
height: 14px;
`;

