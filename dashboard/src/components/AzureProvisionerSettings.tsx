import React, {useContext, useEffect, useState} from "react";
import styled from "styled-components";
import {type RouteComponentProps, withRouter} from "react-router";

import {OFState} from "main/home/onboarding/state";
import api from "shared/api";
import {Context} from "shared/Context";
import {pushFiltered} from "shared/routing";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import InputRow from "./form-components/InputRow";
import {
  AKS,
  AKSNodePool,
  AksSkuTier,
  Cluster,
  Contract,
  EnumCloudProvider,
  EnumKubernetesKind,
  NodePoolType
} from "@porter-dev/api-contracts";
import {type ClusterType} from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";
import {useIntercom} from "lib/hooks/useIntercom";
import Icon from "./porter/Icon";
import dotVertical from "assets/dot-vertical.svg";
import {Label} from "@tanstack/react-query-devtools/build/lib/Explorer";

const locationOptions = [
  { value: "eastus", label: "East US" },
  { value: "eastus2", label: "East US 2" },
    { value: "westus2", label: "West US 2" },
    { value: "westus3", label: "West US 3" },
    { value: "centralus", label: "Central US" },
    { value: "southcentralus", label: "South Central US" },
    { value: "australiaeast", label: "Australia East" },
    { value: "brazilsouth", label: "Brazil South" },
    { value: "centralindia", label: "Central India" },
    { value: "southcentralus", label: "South Central US" },
    { value: "eastasia", label: "East Asia" },
    { value: "francecentral", label: "France Central" },
    { value: "northeurope", label: "North Europe" },
    { value: "norwayeast", label: "Norway East" },
    { value: "swedencentral", label: "Sweden Central" },
    { value: "switzerlandnorth", label: "Switzerland North" },
    { value: "uksouth", label: "UK South" },
    { value: "westeurope", label: "West Europe" },
];

const machineTypeOptions = [
  { value: "Standard_B2als_v2", label: "Standard_B2als_v2"},
  { value: "Standard_A2_v2", label: "Standard_A2_v2" },
  { value: "Standard_A4_v2", label: "Standard_A4_v2" },
];

const skuTierOptions = [
  { value: AksSkuTier.FREE, label: "Free" },
  { value: AksSkuTier.STANDARD, label: "Standard (for production workloads, +$73/month)" },
];

const clusterVersionOptions = [{ value: "v1.27.3", label: "v1.27" }, { value: "v1.24.9", label: "v1.24" }];

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
};

const VALID_CIDR_RANGE_PATTERN = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.0\.0\/16$/;

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
  const [machineType, setMachineType] = useState("Standard_B2als_v2");
  const [isExpanded, setIsExpanded] = useState(false);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [cidrRange, setCidrRange] = useState("10.78.0.0/16");
  const [clusterVersion, setClusterVersion] = useState("v1.27.3");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [skuTier, setSkuTier] = useState(AksSkuTier.FREE)
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);

  const { showIntercomWithMessage } = useIntercom();

  const markStepStarted = async (step: string, {region, error_message}: {region?: string; error_message?: string}) => {
    try {
      await api.updateOnboardingStep("<token>", { step, region, error_message, provider: "azure" }, {
        project_id: currentProject.id,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const getStatus = () => {
    if (isReadOnly && props.provisionerError == "") {
      return "Provisioning is still in progress...";
    } else if (errorMessage !== "") {
      return (
        <Error
          message={errorDetails !== "" ? errorMessage + " (" + errorDetails + ")" : errorMessage}
          ctaText={
            errorMessage !== DEFAULT_ERROR_MESSAGE
              ? "Troubleshooting steps"
              : null
          }
          errorModalContents={errorMessageToModal(errorMessage)}
        />
      );
    }
    return undefined;
  };

  const isDisabled = () => {
    return (
      (!clusterName && true)
      || (isReadOnly && props.provisionerError === "")
      || currentCluster?.status === "UPDATING"
      || isClicked
      || (!currentProject?.enable_reprovision && props.clusterId)
    )
  };


  const validateInputs = (): string => {
    if (!clusterName) {
      return "Cluster name is required";
    }
    if (!azureLocation) {
      return "Azure location is required";
    }
    if (!machineType) {
      return "Machine type is required";
    }
    if (!cidrRange) {
      return "VPC CIDR range is required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(cidrRange)) {
      return "VPC CIDR range must be in the format of [0-255].[0-255].0.0/16";
    }
    if (clusterVersion == "v1.24.9") {
      return "Cluster version v1.24.9 is no longer supported";
    }

    return "";
  }
  const createCluster = async () => {
    const err = validateInputs();
    if (err !== "") {
      setErrorMessage(err)
      setErrorDetails("")
      return;
    }

    setIsClicked(true);
    
    try {
      window.dataLayer?.push({
        event: 'provision-attempt',
        data: {
          cloud: 'azure',
          email: user?.email
        }
      });
    } catch (err) {
      console.log(err);
    }
    
    const data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.AKS,
        cloudProvider: EnumCloudProvider.AZURE,
        cloudProviderCredentialsId: props.credentialId,
        kindValues: {
          case: "aksKind",
          value: new AKS({
            clusterName,
            clusterVersion: clusterVersion || "v1.27.3",
            cidrRange: cidrRange || "10.78.0.0/16",
            location: azureLocation,
            nodePools: [
              new AKSNodePool({
                instanceType: "Standard_B2als_v2",
                minInstances: 1,
                maxInstances: 3,
                nodePoolType: NodePoolType.SYSTEM,
                mode: "User",
              }),
              new AKSNodePool({
                instanceType: "Standard_B2as_v2",
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
            skuTier,
          }),
        },
      }),
    });

    if (props.clusterId) {
      data.cluster.clusterId = props.clusterId;
    }

    try {
      setIsReadOnly(true);
      setErrorMessage("");
      setErrorDetails("")

      if (!props.clusterId) {
        markStepStarted("provisioning-started", { region: azureLocation });
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
      setErrorMessage("");
      setErrorDetails("")
    } catch (err) {
      showIntercomWithMessage({ message: "I am running into an issue provisioning a cluster." });
      let errorMessage = DEFAULT_ERROR_MESSAGE;
      const errorDetails = err.response?.data?.error?.replace("unknown: ", "") ?? "";
      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      if (errorDetails.includes("resource provider")) {
        setErrorDetails(errorDetails);
        errorMessage = AZURE_MISSING_RESOURCE_PROVIDER_MESSAGE;
      } else if (errorDetails.includes("quota")) {
        setErrorDetails(errorDetails);
        errorMessage = AZURE_CORE_QUOTA_ERROR_MESSAGE;
      } else {
        setErrorDetails("");
      }
      setErrorMessage(errorMessage);
      markStepStarted("provisioning-failed", { error_message: `Error message: ${errorMessage}; Error details: ${errorDetails}` });
    } finally {
      setIsReadOnly(false);
      setIsClicked(false);
    }
  };

  useEffect(() => {
    if (!currentProject) return;
    setIsReadOnly(
      !!props.clusterId &&
      (currentCluster?.status === "UPDATING" ||
        currentCluster?.status === "UPDATING_UNAVAILABLE")
    );
    setClusterName(
        `${currentProject?.name.substring(0,16)}-cluster-${Math.random()
        .toString(36)
        .substring(2, 8)}`
    );
  }, []);

  useEffect(() => {

    if (!props.selectedClusterVersion) return;

    // TODO: pass in contract as the already parsed object, rather than JSON (requires changes to AWS/GCP provisioning)
    const contract = Contract.fromJsonString(JSON.stringify(props.selectedClusterVersion))

    if (contract?.cluster?.kindValues && contract.cluster.kindValues.case === "aksKind") {
      const aksValues = contract.cluster.kindValues.value
      aksValues.nodePools.map((nodePool: AKSNodePool) => {
        if (nodePool.nodePoolType === NodePoolType.APPLICATION) {
          setMachineType(nodePool.instanceType);
          setMinInstances(nodePool.minInstances);
          setMaxInstances(nodePool.maxInstances);
        }
      });
      setCreateStatus("");
      setClusterName(aksValues.clusterName);
      setAzureLocation(aksValues.location);
      setClusterVersion(aksValues.clusterVersion);
      setCidrRange(aksValues.cidrRange);
      setSkuTier(aksValues.skuTier)
    }
  }, [props.selectedClusterVersion]);

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <>
          <Text size={16}>Select an Azure location and tier</Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter will automatically provision your infrastructure with the
            specified configuration.
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
          <Spacer y={.75} />
          <div style={{display: "flex", alignItems: "center"}}>
            <Spacer inline x={.05}/>
            <Icon src={dotVertical} height={"15px"}/>
            <Spacer inline x={.1}/>
            <Label>Azure Tier</Label>
          </div>
          <SelectRow
              options={skuTierOptions}
              width="350px"
              disabled={isReadOnly}
              value={skuTier}
              scrollBuffer={true}
              dropdownMaxHeight="240px"
              setActiveValue={setSkuTier}
          />
        </>
      );
    }

    console.log(skuTier as AksSkuTier)
    console.log(skuTierOptions)

    // If settings, update full form
    return (
      <>
        <Heading isAtTop>AKS configuration</Heading>
        <Spacer y={0.75} />
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
        <Spacer y={.75} />
        <div style={{display: "flex", alignItems: "center"}}>
          <Spacer inline x={.05}/>
          <Icon src={dotVertical} height={"15px"}/>
          <Spacer inline x={.1}/>
          <Label>Tier</Label>
        </div>
        <SelectRow
            options={skuTierOptions}
            width="350px"
            disabled={isReadOnly}
            value={skuTier}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setSkuTier}
        />
        {user?.isPorterUser && (
          <Heading>
            <ExpandHeader
              onClick={() => { setIsExpanded(!isExpanded); }}
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
            <Spacer y={.75} />
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
              setValue={(x: number) => { setMaxInstances(x); }}
              label="Maximum number of application nodes"
              placeholder="ex: 1"
            />
            <InputRow
              width="350px"
              type="string"
              disabled={isReadOnly}
              value={cidrRange}
              setValue={(x: string) => { setCidrRange(x); }}
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
      {
        (!currentProject?.enable_reprovision && currentCluster) &&
        <>
          <Spacer y={1} />
          <Text>Updates to the cluster are disabled on this project. Enable re-provisioning by contacting <a href="mailto:support@porter.run">Porter Support</a>.</Text>
        </>
      }
      {user.isPorterUser &&
        <>

          <Spacer y={1} />
          <Text color="yellow">Visible to Admin Only</Text>
          <Button
            color="red"
            onClick={createCluster}
            status={getStatus()}
          >
            Override Provision
          </Button>
        </>
      }
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
    transition: transform 0.1s ease;
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
  "An error occurred while provisioning your infrastructure. Please confirm you have completed all required setup as described in our docs, and try again.  If issues persist, contact support@porter.run.";
const AZURE_CORE_QUOTA_ERROR_MESSAGE =
  "Your Azure subscription has reached a vCPU core quota in the location";
const AZURE_MISSING_RESOURCE_PROVIDER_MESSAGE =
  "Your Azure subscription is missing required resource providers";

const errorMessageToModal = (errorMessage: string) => {
  switch (errorMessage) {
    case AZURE_CORE_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more cores
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to request a quota increase for vCPUs in your region.
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://login.microsoftonline.com/"
              target="_blank"
            >
              your Azure account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBlade"
              target="_blank"
            >
              the Subscriptions page
            </Link>
            <Spacer inline width="5px" />
            and select the subscription you are using to provision Porter.
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Select "Usage + Quotas" under "Settings" from the left panel.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Select "Compute" and search for the quotas that have reached usage limits in your region. Request an increase by clicking the pencil icon on the far right.
          </Step>
          <Spacer y={1} />
          <Text color="helper">
            We recommend an initial quota of 20 vCPUs for both Total Regional Cores and Standard Basv2 Family.
          </Text>
          <Spacer y={1} />
          <Step number={5}>
            Once the request has been approved, return to Porter and retry the
            provision.
          </Step>
          <Spacer y={1} />
          <Text color="helper">
            Quota increases can take several minutes to process. If Azure is unable to automatically increase the quota, create a support request as prompted by Azure. Requests are usually fulfilled in a few hours.
          </Text>
        </>
      );
    case AZURE_MISSING_RESOURCE_PROVIDER_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Registering required resource providers
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to register all of the following resource providers to your Azure subscription before provisioning: Capacity, Compute, ContainerRegistry, ContainerService, ManagedIdentity, Network, OperationalInsights, OperationsManagement, ResourceGraph, Resources, Storage
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://login.microsoftonline.com/"
              target="_blank"
            >
              your Azure account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBlade"
              target="_blank"
            >
              the Subscriptions page
            </Link>
            <Spacer inline width="5px" />
            and select the subscription you are using to provision Porter.
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Select "Resource Providers" under "Settings" from the left panel.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Search for each required resource provider and select "Register" from the top menu bar if it is not already registered.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            After confirming that all providers are registered, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    default:
      return null;
  }
};

const Wrapper = styled.div`
  transform: translateY(+13px);
`;