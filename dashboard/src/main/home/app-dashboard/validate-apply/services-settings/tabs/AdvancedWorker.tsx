import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";
import { type ClientService } from "lib/porter-apps/services";
import React, { useContext, useState } from "react";
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

};

const AdvancedWorker: React.FC<AdvancedProps> = ({ index, clusterContainsGPUNodes }) => {
  const { currentCluster } = useContext(Context);
  const { control } = useFormContext<PorterAppFormData>();
  const [clusterModalVisible, setClusterModalVisible] = useState<boolean>(false);

  return (
    <>
      {
        (currentCluster.cloud_provider === "AWS" && currentProject.gpu_enabled) && <>
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
                (<><Controller
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
                          }
                          else
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
                  )} />
                </>
                )
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
  );
};

export default AdvancedWorker;


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

