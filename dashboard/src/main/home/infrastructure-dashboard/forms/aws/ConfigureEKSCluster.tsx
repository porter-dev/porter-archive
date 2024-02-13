import React, { useMemo, useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAWS } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import { BackButton, Img } from "./CreateEKSClusterForm";

type Props = {
  goBack: () => void;
};

const ConfigureEKSCluster: React.FC<Props> = ({ goBack }) => {
  const [currentStep, _setCurrentStep] = useState<number>(1);

  const { control } = useFormContext<ClientClusterContract>();
  const { fields: nodeGroups } = useFieldArray({
    control,
    name: "cluster.config.nodeGroups",
  });

  const displayableNodeGroups = useMemo(() => {
    const dng = nodeGroups.map((ng, idx) => {
      return {
        nodeGroup: ng,
        idx,
        isIncluded:
          ng.nodeGroupType === "APPLICATION" || ng.nodeGroupType === "CUSTOM",
      };
    });
    return dng;
  }, [nodeGroups]);

  return (
    <div>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={CloudProviderAWS.icon} />
        <Text size={16}>Configure EKS Cluster</Text>
      </Container>
      <Spacer y={1} />
      <Text>Specify settings for your EKS cluster.</Text>
      <Spacer y={1} />
      <VerticalSteps
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Cluster region</Text>
            <Spacer y={0.5} />
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
                    label="📍 AWS region"
                  />
                </Container>
              )}
            />
          </>,
          <>
            <Text size={16}>
              Application node group{" "}
              <a
                href="https://docs.porter.run/other/kubernetes-101"
                target="_blank"
                rel="noreferrer"
              >
                &nbsp;(?)
              </a>
            </Text>
            <Spacer y={0.5} />
            <Container style={{ width: "300px" }}>
              {displayableNodeGroups.map((ng) => {
                return ng.isIncluded ? (
                  <Controller
                    name={`cluster.config.nodeGroups.${ng.idx}`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <>
                        <Select
                          options={CloudProviderAWS.machineTypes.map((t) => ({
                            value: t.name,
                            label: t.displayName,
                          }))}
                          value={value.instanceType}
                          setValue={(newInstanceType: string) => {
                            onChange({
                              ...value,
                              instanceType: newInstanceType,
                            });
                          }}
                          label="Machine type"
                        />
                        <Spacer y={1} />
                        <Input
                          width="100%"
                          type="number"
                          disabled={false}
                          value={value.maxInstances.toString()}
                          setValue={(newMaxInstances: string) => {
                            onChange({
                              ...value,
                              maxInstances: parseInt(newMaxInstances),
                            });
                          }}
                          label="Maximum number of application nodes"
                          placeholder="ex: 1"
                        />
                        <Spacer y={1} />
                        <Input
                          width="100%"
                          type="number"
                          disabled={false}
                          value={value.minInstances.toString()}
                          setValue={(newMinInstances: string) => {
                            onChange({
                              ...value,
                              minInstances: parseInt(newMinInstances),
                            });
                          }}
                          label="Minimum number of application nodes. If set to 0, no applications will be deployed."
                          placeholder="ex: 1"
                        />
                      </>
                    )}
                  />
                ) : null;
              })}
            </Container>
          </>,
          <>
            <Text size={16}>Provision cluster</Text>
            <Spacer y={0.5} />
            <Button>Submit</Button>
          </>,
        ]}
      />
    </div>
  );
};

export default ConfigureEKSCluster;
