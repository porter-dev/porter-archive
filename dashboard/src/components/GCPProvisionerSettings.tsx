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
  GKE,
} from "@porter-dev/api-contracts";
import { ClusterType } from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";

const locationOptions = [
  { value: "us-east1", label: "us-east1" },
];


const clusterVersionOptions = [{ value: "v1.24.9", label: "v1.24.9" }];

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
};

const VALID_CIDR_RANGE_PATTERN = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.0\.0\/16$/;

const GCPProvisionerSettings: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [region, setRegion] = useState(locationOptions[0].value);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [cidrRange, setCidrRange] = useState("10.78.0.0/16");
  const [clusterVersion, setClusterVersion] = useState("v1.24.9");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);

  const markStepStarted = async (step: string) => {
    try {
      await api.updateOnboardingStep("<token>", { step }, {
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
      !user.email.endsWith("porter.run") &&
      ((!clusterName && true) ||
        (isReadOnly && props.provisionerError === "") ||
        props.provisionerError === "" ||
        currentCluster?.status === "UPDATING" ||
        isClicked)
    );
  };

  const validateInputs = (): string => {
    if (!clusterName) {
      return "Cluster name is required";
    }
    if (!region) {
      return "GCP region is required";
    }
    if (!cidrRange) {
      return "VPC CIDR range is required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(cidrRange)) {
      return "VPC CIDR range must be in the format of [0-255].[0-255].0.0/16";
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
    var data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.GKE,
        cloudProvider: EnumCloudProvider.GCP,
        cloudProviderCredentialsId: props.credentialId,
        kindValues: {
          case: "gkeKind",
          value: new GKE({
            clusterName: clusterName,
            clusterVersion: clusterVersion || "v1.24.9",
            cidrRange: cidrRange || "10.78.0.0/16",
            region: region,
            nodePools: [],
          }),
        },
      }),
    });

    if (props.clusterId) {
      data["cluster"]["clusterId"] = props.clusterId;
    }

    try {
      setIsReadOnly(true);
      setErrorMessage("");
      setErrorDetails("")

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
      setErrorMessage("");
      setErrorDetails("")
    } catch (err) {
      const errMessage = err.response.data.error.replace("unknown: ", "");
      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      if (errMessage.includes("resource provider")) {
        setErrorMessage(AZURE_MISSING_RESOURCE_PROVIDER_MESSAGE);
        setErrorDetails(errMessage)
      } else if (errMessage.includes("quota")) {
        setErrorMessage(AZURE_CORE_QUOTA_ERROR_MESSAGE)
        setErrorDetails(errMessage)
      } else {
        setErrorMessage(DEFAULT_ERROR_MESSAGE);
        setErrorDetails("")
      }
    } finally {
      setIsReadOnly(false);
      setIsClicked(false);
    }
  };

  useEffect(() => {
    setIsReadOnly(
      props.clusterId &&
      (currentCluster?.status === "UPDATING" ||
        currentCluster?.status === "UPDATING_UNAVAILABLE")
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
      setRegion(contract.cluster.aksKind.location);
      setClusterVersion(contract.cluster.aksKind.clusterVersion);
      setCidrRange(contract.cluster.aksKind.cidrRange);
    }
  }, [props.selectedClusterVersion]);

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <>
          <Text size={16}>Select a Google Cloud Region for your cluster</Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter will provision your infrastructure in the
            specified location.
          </Text>
          <Spacer height="10px" />
          <SelectRow
            options={locationOptions}
            width="350px"
            disabled={isReadOnly}
            value={region}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setRegion}
            label="📍 GCP location"
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
        <Heading isAtTop>GCP configuration</Heading>
        <SelectRow
          options={locationOptions}
          width="350px"
          disabled={isReadOnly || true}
          value={region}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setRegion}
          label="📍 Google Cloud Region"
        />
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

export default withRouter(GCPProvisionerSettings);


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
            We recommend an initial quota of 30 vCPUs for both Total Regional Cores and Standard Av2 Family.
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
