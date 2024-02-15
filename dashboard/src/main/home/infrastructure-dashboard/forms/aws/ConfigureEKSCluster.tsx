import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import Back from "components/porter/Back";
import Image from "components/porter/Image";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAWS } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import NodeGroups from "../../shared/NodeGroups";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
  createButtonProps: {
    status: "loading" | JSX.Element | "success" | "";
    isDisabled: boolean;
    loadingText: string;
  };
};

const ConfigureEKSCluster: React.FC<Props> = ({
  goBack,
  createButtonProps,
}) => {
  const [currentStep, _setCurrentStep] = useState<number>(4);

  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ClientClusterContract>();

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
              Lowercase letters, numbers, and "-" only.
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
          <>
            <Text size={16}>
              Application node group
            </Text>
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
          <Button
            key={3}
            type="submit"
            status={createButtonProps.status}
            disabled={createButtonProps.isDisabled}
            loadingText={createButtonProps.loadingText}
          >
            Create resources
          </Button>,
        ]}
      />
    </div>
  );
};

export default ConfigureEKSCluster;
