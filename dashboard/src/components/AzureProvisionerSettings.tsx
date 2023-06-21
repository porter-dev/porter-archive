import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import { OFState } from "main/home/onboarding/state";
import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import InputRow from "./form-components/InputRow";
import {
  Contract,
  EnumKubernetesKind,
  EnumCloudProvider,
  Cluster,
  AKS,
  AKSNodePool,
  NodePoolType,
} from "@porter-dev/api-contracts";
import { ClusterType } from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";

const locationOptions = [
  { value: "eastus", label: "East US" },
  { value: "westus2", label: "West US 2" },
  { value: "westus3", label: "West US 3" },
  { value: "canadacentral", label: "Central Canada" },
];

const machineTypeOptions = [
  { value: "Standard_A2_v2", label: "Standard_A2_v2" },
  { value: "Standard_A4_v2", label: "Standard_A4_v2" },
];

const clusterVersionOptions = [{ value: "v1.24.9", label: "v1.24.9" }];

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
};

const AzureProvisionerSettings: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
    setHasFinishedOnboarding,
  } = useContext(Context);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [azureLocation, setAzureLocation] = useState("eastus");
  const [machineType, setMachineType] = useState("Standard_A2_v2");
  const [isExpanded, setIsExpanded] = useState(false);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [cidrRange, setCidrRange] = useState("10.78.0.0/16");
  const [clusterVersion, setClusterVersion] = useState("v1.24.9");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>(undefined);
  const [isClicked, setIsClicked] = useState(false);

  const markStepStarted = async (step: string) => {
    try {
      await api.updateOnboardingStep("<token>", { step }, {});
    } catch (err) {
      console.log(err);
    }
  };

  const getStatus = () => {
    if (isReadOnly && props.provisionerError == "") {
      return "Provisioning is still in progress...";
    } else if (errorMessage) {
      return (
        <Error
          message={errorMessage}
          ctaText={
            errorMessage !== DEFAULT_ERROR_MESSAGE
              ? "Troubleshooting steps"
              : null
          }
          errorModalContents={null}
        />
      );
    }
    return undefined;
  };
  const isDisabled = () => {
    return (
      !user.email.endsWith("porter.run") &&
      ((!clusterName && true) ||
        (isReadOnly && props.provisionerError === "") ||
        props.provisionerError === "" ||
        currentCluster.status === "UPDATING" ||
        isClicked)
    );
  };
  const createCluster = async () => {
    setIsClicked(true);
    var data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.AKS,
        cloudProvider: EnumCloudProvider.AZURE,
        cloudProviderCredentialsId: props.credentialId,
        kindValues: {
          case: "aksKind",
          value: new AKS({
            clusterName: clusterName,
            clusterVersion: clusterVersion || "v1.24.9",
            cidrRange: cidrRange || "10.78.0.0/16",
            location: azureLocation,
            nodePools: [
              new AKSNodePool({
                instanceType: "Standard_A2_v2",
                minInstances: 1,
                maxInstances: 3,
                nodePoolType: NodePoolType.SYSTEM,
                mode: "User",
              }),
              new AKSNodePool({
                instanceType: "Standard_A4_v2",
                minInstances: 1,
                maxInstances: 3,
                nodePoolType: NodePoolType.MONITORING,
                mode: "User",
              }),
              new AKSNodePool({
                instanceType: machineType,
                minInstances: minInstances || 1,
                maxInstances: maxInstances || 10,
                nodePoolType: NodePoolType.APPLICATION,
                mode: "User",
              }),
            ],
          }),
        },
      }),
    });

    if (props.clusterId) {
      data["cluster"]["clusterId"] = props.clusterId;
    }

    try {
      setIsReadOnly(true);
      setErrorMessage(undefined);

      if (!props.clusterId) {
        markStepStarted("provisioning-started");
      }

      const res = await api.createContract("<token>", data, {
        project_id: currentProject.id,
      });

      // Only refresh and set clusters on initial create
      // if (!props.clusterId) {
      setShouldRefreshClusters(true);
      api
        .getClusters("<token>", {}, { id: currentProject.id })
        .then(({ data }) => {
          data.forEach((cluster: ClusterType) => {
            if (cluster.id === res.data.contract_revision?.cluster_id) {
              // setHasFinishedOnboarding(true);
              setCurrentCluster(cluster);
              OFState.actions.goTo("clean_up");
              pushFiltered(props, "/cluster-dashboard", ["project_id"], {
                cluster: cluster.name,
              });
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });
      // }
      setErrorMessage(undefined);
    } catch (err) {
      const errMessage = err.response.data.error.replace("unknown: ", "");
      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsReadOnly(false);
      setIsClicked(false);
    }
  };

  useEffect(() => {
    setIsReadOnly(
      props.clusterId &&
        (currentCluster.status === "UPDATING" ||
          currentCluster.status === "UPDATING_UNAVAILABLE")
    );
    setClusterName(
      `${currentProject.name}-cluster-${Math.random()
        .toString(36)
        .substring(2, 8)}`
    );
  }, []);

  useEffect(() => {
    const contract = props.selectedClusterVersion as any;
    if (contract?.cluster) {
      contract.cluster.aksKind.nodePools.map((nodePool: any) => {
        if (nodePool.nodePoolType === "NODE_POOL_TYPE_APPLICATION") {
          setMachineType(nodePool.instanceType);
          setMinInstances(nodePool.minInstances);
          setMaxInstances(nodePool.maxInstances);
        }
      });
      setCreateStatus("");
      setClusterName(contract.cluster.aksKind.clusterName);
      setAzureLocation(contract.cluster.aksKind.location);
      setClusterVersion(contract.cluster.aksKind.clusterVersion);
      setCidrRange(contract.cluster.aksKind.cidrRange);
    }
  }, [props.selectedClusterVersion]);

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <>
          <Text size={16}>Select an Azure location</Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter will automatically provision your infrastructure in the
            specified location.
          </Text>
          <Spacer height="10px" />
          <SelectRow
            options={locationOptions}
            width="350px"
            disabled={isReadOnly}
            value={azureLocation}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setAzureLocation}
            label="📍 Azure location"
          />
          <SelectRow
            options={machineTypeOptions}
            width="350px"
            disabled={isReadOnly}
            value={machineType}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setMachineType}
            label="Machine type"
          />
          <InputRow
            width="350px"
            type="string"
            disabled={isReadOnly}
            value={cidrRange}
            setValue={(x: string) => setCidrRange(x)}
            label="VPC CIDR range"
            placeholder="ex: 10.78.0.0/16"
          />
        </>
      );
    }

    // If settings, update full form
    return (
      <>
        <Heading isAtTop>AKS configuration</Heading>
        <SelectRow
          options={locationOptions}
          width="350px"
          disabled={isReadOnly || true}
          value={azureLocation}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setAzureLocation}
          label="📍 Azure location"
        />
        {user?.isPorterUser && (
          <Heading>
            <ExpandHeader
              onClick={() => setIsExpanded(!isExpanded)}
              isExpanded={isExpanded}
            >
              <i className="material-icons">arrow_drop_down</i>
              Advanced settings
            </ExpandHeader>
          </Heading>
        )}
        {isExpanded && (
          <>
            <SelectRow
              options={clusterVersionOptions}
              width="350px"
              disabled={isReadOnly}
              value={clusterVersion}
              scrollBuffer={true}
              dropdownMaxHeight="240px"
              setActiveValue={setClusterVersion}
              label="Cluster version"
            />
            <SelectRow
              options={machineTypeOptions}
              width="350px"
              disabled={isReadOnly}
              value={machineType}
              scrollBuffer={true}
              dropdownMaxHeight="240px"
              setActiveValue={setMachineType}
              label="Machine type"
            />
            <InputRow
              width="350px"
              type="number"
              disabled={isReadOnly}
              value={maxInstances}
              setValue={(x: number) => setMaxInstances(x)}
              label="Maximum number of application EC2 instances"
              placeholder="ex: 1"
            />
            <InputRow
              width="350px"
              type="string"
              disabled={isReadOnly}
              value={cidrRange}
              setValue={(x: string) => setCidrRange(x)}
              label="VPC CIDR range"
              placeholder="ex: 10.78.0.0/16"
            />
          </>
        )}
      </>
    );
  };

  return (
    <>
      <StyledForm>{renderForm()}</StyledForm>
      <Button
        disabled={isDisabled()}
        onClick={createCluster}
        status={getStatus()}
      >
        Provision
      </Button>
    </>
  );
};

export default withRouter(AzureProvisionerSettings);

const ExpandHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  cursor: pointer;
  > i {
    margin-right: 7px;
    margin-left: -7px;
    transform: ${(props) =>
      props.isExpanded ? "rotate(0deg)" : "rotate(-90deg)"};
  }
`;

const StyledForm = styled.div`
  position: relative;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;

const DEFAULT_ERROR_MESSAGE =
  "An error occurred while provisioning your infrastructure. Please try again.";
