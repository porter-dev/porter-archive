import React, { useMemo, useState } from "react";
import { Switch } from "@material-ui/core";
import { Controller, useFormContext } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";
import { type PorterAppFormData } from "lib/porter-apps";

import infra from "assets/cluster.svg";

type Props = {
  index: number;
};

// TODO: allow users to provision multiple GPU nodes in the slider
const GPUResources: React.FC<Props> = ({ index }) => {
  const history = useHistory();

  const { cluster } = useClusterContext();

  const [clusterModalVisible, setClusterModalVisible] =
    useState<boolean>(false);

  const { control } = useFormContext<PorterAppFormData>();

  const canEnableGPU = useMemo(() => {
    return (
      cluster.contract.config.cluster.config.nodeGroups.some(
        (ng) => ng.nodeGroupType === "CUSTOM"
      ) && cluster.contract.condition === "SUCCESS"
    );
  }, [cluster]);

  const clusterIsUpdating = useMemo(() => {
    return cluster.contract.condition === "";
  }, [cluster]);

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
                disabled={clusterIsUpdating}
                onChange={() => {
                  if (!value.enabled.value && !canEnableGPU) {
                    setClusterModalVisible(true);
                    return;
                  }
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
            </Container>

            <Spacer y={0.5} />
            {clusterModalVisible && (
              <Modal
                closeModal={() => {
                  setClusterModalVisible(false);
                }}
              >
                <div>
                  <Text size={16}>Cluster GPU check</Text>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Your cluster is not yet configured to allow applications to
                    run on GPU nodes. You can add a GPU node group in your
                    infrastructure dashboard.
                  </Text>
                  <Spacer y={1} />
                  <Button
                    alt
                    onClick={() => {
                      history.push(`/infrastructure/${cluster.id}`);
                    }}
                  >
                    To infrastructure
                  </Button>
                </div>
              </Modal>
            )}
          </>
        )}
      />
      {/* {maxGPU > 1 && gpu.value && (
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
      )} */}
      {clusterIsUpdating && (
        <CheckItemContainer>
          <CheckItemTop>
            <Loading offset="0px" width="20px" height="20px" />
            <Spacer inline x={1} />
            <Text>{"Cluster is updating..."}</Text>
            <Spacer inline x={1} />
            <Tag>
              <Link to={`/infrastructure/${cluster.id}`}>
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

export default GPUResources;

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
