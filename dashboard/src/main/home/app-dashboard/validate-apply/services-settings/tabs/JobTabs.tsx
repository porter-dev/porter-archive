import React, { useContext, useState } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { Height } from "react-animate-height";
import { Switch } from "@material-ui/core";
import styled from "styled-components";

import { type ClientService } from "lib/porter-apps/services";
import { match } from "ts-pattern";
import MainTab from "./Main";
import Resources from "./Resources";
import { Controller, useFormContext } from "react-hook-form";
import { type PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "components/porter/ControlledInput";
import ProvisionClusterModal from "main/home/sidebar/ProvisionClusterModal";
import Loading from "components/Loading";
import { Context } from "shared/Context";

type Props = {
  index: number;
  service: ClientService & {
    config: {
      type: "job" | "predeploy";
    };
  };
  chart?: any;
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
  isPredeploy?: boolean;
}

const JobTabs: React.FC<Props> = ({
  index,
  service,
  maxRAM,
  clusterContainsGPUNodes,
  maxCPU,
  isPredeploy,
}) => {
  const { currentCluster } = useContext(Context);
  const { control, register } = useFormContext<PorterAppFormData>();
  const [clusterModalVisible, setClusterModalVisible] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = React.useState<
    "main" | "resources" | "advanced"
  >("main");

  const tabs = isPredeploy
    ? [
      { label: "Main", value: "main" as const },
      { label: "Resources", value: "resources" as const },
    ]
    : [
      { label: "Main", value: "main" as const },
      { label: "Resources", value: "resources" as const },
      { label: "Advanced", value: "advanced" as const },
    ];

  return (
    <>
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {match(currentTab)
        .with("main", () => <MainTab index={index} service={service} isPredeploy={isPredeploy} />)
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            clusterContainsGPUNodes={clusterContainsGPUNodes}
            service={service}
            isPredeploy={isPredeploy}
          />
        ))
        .with("advanced", () => (
          <>
            <Spacer y={1} />
            <Controller
              name={`app.services.${index}.config.allowConcurrent`}
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
                  <Text color="helper">Allow jobs to execute concurrently</Text>
                </Checkbox>
              )}
            />
            <Spacer y={1} />
            <ControlledInput
              type="text"
              label="Timeout (seconds)"
              placeholder="ex: 3600"
              width="300px"
              disabled={service.config.timeoutSeconds.readOnly}
              disabledTooltip={
                "You may only edit this field in your porter.yaml."
              }
              {...register(`app.services.${index}.config.timeoutSeconds.value`)}
            />
            {(currentCluster.cloud_provider === "AWS" && currentProject.gpu_enabled) && <>
              <>
                <Spacer y={1} />
                <>
                  {(currentCluster.status === "UPDATING" && clusterContainsGPUNodes) ?
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
                    (<Controller
                      name={`app.services.${index}.gpuCoresNvidia`}
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <><Switch
                          size="small"
                          color="primary"
                          checked={value.value > 0}
                          onChange={() => {
                            if (!clusterContainsGPUNodes && value.value === 0) {
                              setClusterModalVisible(true);
                            } else {
                              if (value.value > 0) {
                                onChange({
                                  ...value,
                                  value: 0
                                });
                              } else
                                onChange({
                                  ...value,
                                  value: 1
                                });
                            }
                          }}
                          inputProps={{ 'aria-label': 'controlled' }} /><Spacer inline x={.5} /><Text color="helper">
                            <>
                              <span>Enable GPU</span>
                              <a
                                href="https://docs.porter.run/enterprise/deploying-applications/zero-downtime-deployments#health-checks"
                                target="_blank" rel="noreferrer"
                              >
                                &nbsp;(?)
                              </a>
                            </>
                          </Text><Spacer y={.5} />
                          {clusterContainsGPUNodes && value.value === 0 && <Text>
                            You have GPU nodes available in your cluster. Toggle this to enable GPU support for this service.
                          </Text>}
                        </>
                      )} />)
                  }
                </>
              </>
              {
                clusterModalVisible && <ProvisionClusterModal
                  closeModal={() => { setClusterModalVisible(false); }}
                  gpuModal={true}
                />
              }
            </>
            }
          </>
        ))
        .exhaustive()}
    </>
  );
};

export default JobTabs;


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
