import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useFormContext } from "react-hook-form";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAzure } from "lib/clusters/constants";
import type {
  ClientClusterContract,
  ClientMachineType,
  MachineType,
} from "lib/clusters/types";
import { useIntercom } from "lib/hooks/useIntercom";

import { valueExists } from "shared/util";

import Error from "../../../../../components/porter/Error";
import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import NodeGroups from "../../shared/NodeGroups";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
  availableMachineTypes: (region: string) => Promise<MachineType[]>;
};

const ConfigureAKSCluster: React.FC<Props> = ({
  goBack,
  availableMachineTypes,
}) => {
  const [currentStep, _setCurrentStep] = useState<number>(100); // hack to show all steps
  const [customSetupRequired, setCustomSetupRequired] =
    useState<boolean>(false);
  const { showIntercomWithMessage } = useIntercom();

  useEffect(() => {
    if (customSetupRequired) {
      showIntercomWithMessage({
        message: "I need custom configuration for creating  an Azure cluster.",
      });
    }
  }, [customSetupRequired]);

  const {
    control,
    register,
    setValue,
    formState: { errors },
    watch,
  } = useFormContext<ClientClusterContract>();

  const { isMultiClusterEnabled } = useClusterFormContext();

  const region = watch("cluster.config.region");
  const clusterId = watch("cluster.clusterId");
  const nodeGroups = watch("cluster.config.nodeGroups");

  const defaultNodeGroupType = (
    nodeGroupType:
      | "UNKNOWN"
      | "SYSTEM"
      | "MONITORING"
      | "APPLICATION"
      | "CUSTOM",
    availableMachineTypes: ClientMachineType[]
  ): string => {
    // default machine types for each node group type
    const applicationMachineTypes = ["Standard_B2als_v2", "Standard_A2_v2"];
    const systemMachineTypes = ["Standard_B2als_v2", "Standard_A2_v2"];
    const monitoringMachineTypes = ["Standard_B2as_v2", "Standard_A4_v2"];
    const gpuMachineTypes = ["Standard_NC4as_T4_v3"];

    const availableNonGPUMachineTypes = availableMachineTypes
      .filter((mt) => !mt.isGPU)
      .map((mt) => mt.name.toString());
    const availableGPUMachineTypes = availableMachineTypes
      .filter((mt) => mt.isGPU)
      .map((mt) => mt.name.toString());
    if (nodeGroupType === "APPLICATION") {
      for (const machineType of applicationMachineTypes) {
        if (availableNonGPUMachineTypes.includes(machineType)) {
          return machineType;
        }
      }
      // if no default application machine types are available, default to first available machine type
      return availableMachineTypes[0].name;
    } else if (nodeGroupType === "SYSTEM") {
      for (const machineType of systemMachineTypes) {
        if (availableNonGPUMachineTypes.includes(machineType)) {
          return machineType;
        }
      }
    } else if (nodeGroupType === "MONITORING") {
      for (const machineType of monitoringMachineTypes) {
        if (availableNonGPUMachineTypes.includes(machineType)) {
          return machineType;
        }
      }
    } else if (nodeGroupType === "CUSTOM") {
      for (const machineType of gpuMachineTypes) {
        if (availableGPUMachineTypes.includes(machineType)) {
          return machineType;
        }
      }
      // if no default gpu machine types are available, default to first available gpu machine type
      return availableGPUMachineTypes[0];
    }

    return "";
  };

  const { data: machineTypes, status: machineTypesStatus } = useQuery(
    ["availableMachineTypes", region],
    async () => {
      try {
        const machineTypes = await availableMachineTypes(region);
        const machineTypesNames = machineTypes.map(
          (machineType) => machineType.name
        );

        return CloudProviderAzure.machineTypes.filter((mt) =>
          machineTypesNames.includes(mt.name)
        );
      } catch (err) {
        // fallback to default machine types if api call fails
        return CloudProviderAzure.machineTypes.filter((mt) =>
          mt.supportedRegions.includes(region)
        );
      }
    }
  );

  const regionValid =
    !customSetupRequired && machineTypesStatus !== "loading" && machineTypes;

  useEffect(() => {
    if (
      clusterId || // if cluster has already been provisioned, don't change instance types that have been set
      machineTypesStatus === "loading" ||
      !machineTypes || // if machine types are still loading, don't change instance types
      !nodeGroups ||
      nodeGroups.length === 0 // wait until node groups are loaded
    ) {
      return;
    }

    let instanceTypeReplaced = false;
    const substituteBadInstanceTypes = nodeGroups.map((nodeGroup) => {
      const defaultMachineType = defaultNodeGroupType(
        nodeGroup.nodeGroupType,
        machineTypes
      );

      if (nodeGroup.instanceType !== defaultMachineType) {
        instanceTypeReplaced = true;
        return {
          ...nodeGroup,
          instanceType: defaultMachineType,
        };
      }

      return nodeGroup;
    });

    // if we cannot find a valid machine type for any node group, set custom setup required and exit
    for (const nodeGroup of substituteBadInstanceTypes) {
      if (nodeGroup.instanceType === "") {
        setCustomSetupRequired(true);
        return;
      }
    }

    // if we reach here, custom setup is not required
    if (customSetupRequired) {
      setCustomSetupRequired(false);
    }

    // if any instance types were replaced, update the form
    if (instanceTypeReplaced) {
      setValue(`cluster.config.nodeGroups`, substituteBadInstanceTypes);
    }
  }, [machineTypes, machineTypesStatus, region]);

  return (
    <div>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={CloudProviderAzure.icon} />
        <Text size={16}>Configure AKS Cluster</Text>
      </Container>
      <Spacer y={1} />
      <Text>Specify settings for your AKS infrastructure.</Text>
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
                    options={CloudProviderAzure.regions.map((region) => ({
                      value: region.name,
                      label: region.displayName,
                    }))}
                    setValue={(selected: string) => {
                      onChange(selected);
                    }}
                    value={value}
                    label="📍 Azure region"
                  />
                </Container>
              )}
            />
            {machineTypesStatus === "loading" ? (
              <Container style={{ width: "300px" }}>
                <Spacer y={1} />
                <Loading />
              </Container>
            ) : (
              customSetupRequired && (
                <Container style={{ width: "500px" }}>
                  <Spacer y={1} />
                  <Error
                    message={
                      "Azure has limited instance types for your subscription in this region. Please select a different region, or contact Porter support for assistance."
                    }
                  />
                </Container>
              )
            )}
          </>,
          <>
            <Container style={{ width: "300px" }}>
              <Text size={16}>Azure tier</Text>
              {!customSetupRequired && (
                <>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Select Azure cluster management tier.{" "}
                    <a
                      href="https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers"
                      target="_blank"
                      rel="noreferrer"
                    >
                      &nbsp;(?)
                    </a>
                  </Text>
                  <Spacer y={0.7} />
                  <Controller
                    name={`cluster.config.skuTier`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={CloudProviderAzure.config.skuTiers.map(
                          (tier) => ({
                            value: tier.name,
                            label: tier.displayName,
                          })
                        )}
                        value={value}
                        setValue={(newSkuTier: string) => {
                          onChange(newSkuTier);
                        }}
                      />
                    )}
                  />
                </>
              )}
            </Container>
          </>,
          isMultiClusterEnabled ? (
            <>
              <Text size={16}>CIDR range</Text>
              <Spacer y={0.5} />
              {regionValid && (
                <>
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
              )}
            </>
          ) : null,
          <>
            <Text size={16}>Application node group </Text>
            <Spacer y={0.5} />
            {regionValid && (
              <>
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
                <NodeGroups availableMachineTypes={machineTypes} isCreating />
              </>
            )}
          </>,
          <>
            <Text size={16}>Provision cluster</Text>
            <Spacer y={0.5} />
            <ClusterSaveButton forceDisable={customSetupRequired}>
              Submit
            </ClusterSaveButton>
          </>,
        ].filter(valueExists)}
      />
    </div>
  );
};

export default ConfigureAKSCluster;
