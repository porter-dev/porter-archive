import React, { useContext, useState } from "react";
import { Switch } from "@material-ui/core";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import InputSlider from "components/porter/InputSlider";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import ProvisionClusterModal from "main/home/sidebar/ProvisionClusterModal";
import { type PorterAppFormData } from "lib/porter-apps";

import { Context } from "shared/Context";
import addCircle from "assets/add-circle.png";
import infra from "assets/cluster.svg";

type Props = {
  clusterContainsGPUNodes: boolean;
  maxGPU: number;
  index: number;
};

// TODO: delete this file and all references once new infra tab is GA
const OldGPUResources: React.FC<Props> = ({
  clusterContainsGPUNodes,
  maxGPU,
  index,
}) => {
  const { currentCluster } = useContext(Context);
  const [clusterModalVisible, setClusterModalVisible] =
    useState<boolean>(false);

  const { control, watch } = useFormContext<PorterAppFormData>();
  const gpu = watch(`app.services.${index}.gpu.enabled`, {
    readOnly: false,
    value: false,
  });
  return (
    <>
      <Spacer y={1} />
      <Controller
        name={`app.services.${index}.gpu`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <>
            <Container row>
              <Switch
                size="small"
                color="primary"
                checked={value.enabled.value}
                disabled={!clusterContainsGPUNodes}
                onChange={() => {
                  onChange({
                    ...value,
                    enabled: {
                      ...value.enabled,
                      value: !value.enabled.value,
                    },
                    gpuCoresNvidia: {
                      ...value.gpuCoresNvidia,
                      value: value.enabled.value ? 0 : 1,
                    },
                  });
                }}
                inputProps={{ "aria-label": "controlled" }}
              />
              <Spacer inline x={0.5} />
              <Text>
                <>
                  <span>Enable GPU</span>
                </>
              </Text>

              {!clusterContainsGPUNodes && (
                <>
                  <Spacer inline x={1} />
                  <Text color="helper">
                    Your cluster has no GPU nodes available.
                  </Text>
                  <Spacer inline x={0.5} />
                  {currentCluster?.status !== "UPDATING" && (
                    <Tag>
                      <Link
                        onClick={() => {
                          setClusterModalVisible(true);
                        }}
                      >
                        <TagIcon src={addCircle} />
                        Add GPU nodes
                      </Link>
                    </Tag>
                  )}
                </>
              )}
            </Container>

            <Spacer y={0.5} />
            {clusterModalVisible && (
              <ProvisionClusterModal
                closeModal={() => {
                  setClusterModalVisible(false);
                }}
                gpuModal={true}
                gcp={currentCluster?.cloud_provider === "GCP"}
                azure={currentCluster?.cloud_provider === "Azure"}
              />
            )}
          </>
        )}
      />
      {maxGPU > 1 && gpu.value && (
        <>
          <Spacer y={1} />
          <Controller
            name={`app.services.${index}.gpu`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <InputSlider
                label="GPU"
                unit=""
                min={0}
                max={maxGPU}
                value={(value?.gpuCoresNvidia.value ?? 1).toString()}
                disabled={value?.gpuCoresNvidia.readOnly}
                setValue={(e) => {
                  onChange({
                    ...value,
                    gpuCoresNvidia: {
                      ...value.gpuCoresNvidia,
                      value: e,
                    },
                  });
                }}
                disabledTooltip={
                  "You may only edit this field in your porter.yaml."
                }
              />
            )}
          />
        </>
      )}
      {currentCluster?.status === "UPDATING" && !clusterContainsGPUNodes && (
        <CheckItemContainer>
          <CheckItemTop>
            <Loading offset="0px" width="20px" height="20px" />
            <Spacer inline x={1} />
            <Text>{"Cluster is updating..."}</Text>
            <Spacer inline x={1} />
            <Tag>
              <Link to={`/cluster-dashboard`}>
                <TagIcon src={infra} />
                View Status
              </Link>
            </Tag>
          </CheckItemTop>
        </CheckItemContainer>
      )}
    </>
  );
};

export default OldGPUResources;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
