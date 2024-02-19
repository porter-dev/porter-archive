import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import Back from "components/porter/Back";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Image from "components/porter/Image";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAWS } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import { valueExists } from "shared/util";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import NodeGroups from "../../shared/NodeGroups";

type Props = {
  goBack: () => void;
};

const ConfigureEKSCluster: React.FC<Props> = ({ goBack }) => {
  const [currentStep, _setCurrentStep] = useState<number>(100); // hack to show all steps

  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ClientClusterContract>();

  const { isAdvancedSettingsEnabled } = useClusterFormContext();

  return (
    <div>
      <Back onClick={goBack} />
      <Container row>
        <Image src={CloudProviderAWS.icon} size={22} />
        <Spacer inline x={1} />
        <Text size={21}>Configure AWS settings</Text>
      </Container>
      <Spacer y={1} />
      <Text color="helper">Specify settings for your AWS infrastructure.</Text>
      <Spacer y={1} />
      <VerticalSteps
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Cluster name</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Lowercase letters, numbers, and &quot;-&quot; only.
            </Text>
            <Spacer y={0.7} />
            <ControlledInput
              placeholder="ex: my-cluster"
              type="text"
              width="300px"
              error={errors.cluster?.config?.clusterName?.message}
              {...register("cluster.config.clusterName")}
            />
          </>,
          <>
            <Text size={16}>Region</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Select the region where you want to run your cluster.
            </Text>
            <Spacer y={0.7} />
            <Controller
              name={`cluster.config.region`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <Container style={{ width: "300px" }}>
                  <Select
                    options={CloudProviderAWS.regions.map((region) => ({
                      value: region.name,
                      label: region.displayName,
                    }))}
                    setValue={(selected: string) => {
                      onChange(selected);
                    }}
                    value={value}
                  />
                </Container>
              )}
            />
          </>,
          isAdvancedSettingsEnabled ? (
            <>
              <Text size={16}>CIDR range</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Specify the CIDR range for your cluster.
              </Text>
              <Spacer y={0.7} />
              <ControlledInput
                placeholder="ex: 10.78.0.0/16"
                type="text"
                width="300px"
                error={errors.cluster?.config?.cidrRange?.message}
                {...register("cluster.config.cidrRange")}
              />
            </>
          ) : null,
          <>
            <Text size={16}>Application node group</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Configure your application infrastructure.{" "}
              <a
                href="https://docs.porter.run/other/kubernetes-101"
                target="_blank"
                rel="noreferrer"
              >
                &nbsp;(?)
              </a>
            </Text>
            <Spacer y={1} />
            <NodeGroups availableMachineTypes={CloudProviderAWS.machineTypes} />
          </>,
          <>
            <Text size={16}>Provision cluster</Text>
            <Spacer y={0.5} />
            <ClusterSaveButton>Submit</ClusterSaveButton>
          </>,
        ].filter(valueExists)}
      />
    </div>
  );
};

export default ConfigureEKSCluster;
