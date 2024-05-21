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
  GKE,
  GKENetwork,
  GKENodePool,
  GKENodePoolType,
  GKEPreflightValues,
  PreflightCheckRequest
} from "@porter-dev/api-contracts";
import { ClusterType } from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.svg";
import Loading from "components/Loading";
import Placeholder from "./Placeholder";
import Fieldset from "./porter/Fieldset";
import ExpandableSection from "./porter/ExpandableSection";
import PreflightChecks from "./PreflightChecks";
import VerticalSteps from "./porter/VerticalSteps";
import { useIntercom } from "lib/hooks/useIntercom";
import { log } from "console";
import InputSlider from "./porter/InputSlider";
import Select from "./porter/Select";


const locationOptions = [
  { value: "us-east1", label: "us-east1 (South Carolina, USA)" },
  { value: "us-east4", label: "us-east4 (Virginia, USA)" },
  { value: "us-central1", label: "us-central1 (Iowa, USA)" },
  { value: "europe-north1", label: "europe-north1 (Hamina, Finland)" },
  { value: "europe-central2", label: "europe-central2 (Warsaw, Poland)" },
  { value: "europe-west1", label: "europe-west1 (St. Ghislain, Belgium)" },
  { value: "europe-west2", label: "europe-west2 (London, England)" },
  { value: "europe-west6", label: "europe-west6 (Zurich, Switzerland)" },
  { value: "asia-south1", label: "asia-south1 (Mumbia, India)" },
  { value: "us-west1", label: "us-west1 (Oregon, USA)" },
  { value: "us-west2", label: "us-west2 (Los Angeles, USA)" },
  { value: "us-west3", label: "us-west3 (Salt Lake City, USA)" },
  { value: "us-west4", label: "us-west4 (Las Vegas, USA)" },
];

const defaultClusterNetworking = new GKENetwork({
  cidrRange: "10.78.0.0/16",
  controlPlaneCidr: "10.77.0.0/28",
  podCidr: "10.76.0.0/16",
  serviceCidr: "10.75.0.0/16",
});

const instanceTypes = [
  { value: "e2-standard-2", label: "e2-standard-2" },
  { value: "e2-standard-4", label: "e2-standard-4" },
  { value: "e2-standard-8", label: "e2-standard-8" },
  { value: "e2-standard-16", label: "e2-standard-16" },
  { value: "e2-standard-32", label: "e2-standard-32" },
  { value: "c3-standard-4", label: "c3-standard-4" },
  { value: "c3-standard-8", label: "c3-standard-8" },
  { value: "c3-standard-22", label: "c3-standard-22" },
  { value: "c3-standard-44", label: "c3-standard-44" },
  { value: "c3-highcpu-4", label: "c3-highcpu-4" },
  { value: "c3-highcpu-8", label: "c3-highcpu-8" },
  { value: "c3-highcpu-22", label: "c3-highcpu-22" },
  { value: "c3-highcpu-44", label: "c3-highcpu-44" },
  { value: "c3-highmem-4", label: "c3-highmem-4" },
  { value: "c3-highmem-8", label: "c3-highmem-8" },
  { value: "c3-highmem-22", label: "c3-highmem-22" },
  { value: "c3-highmem-44", label: "c3-highmem-44" }, // Maximum of 1 GPU per node until further notice
];

const gpuMachineTypeOptions = [
  { value: "n1-standard-1", label: "n1-standard-1" }, // start of GPU nodes. 
  { value: "n1-standard-2", label: "n1-standard-2" },
  { value: "n1-standard-4", label: "n1-standard-4" },
  { value: "n1-standard-8", label: "n1-standard-8" },
  { value: "n1-standard-16", label: "n1-standard-16" },
  { value: "n1-standard-32", label: "n1-standard-32" },
  { value: "n1-highmem-2", label: "n1-highmem-2" },
  { value: "n1-highmem-4", label: "n1-highmem-4" },
  { value: "n1-highmem-8", label: "n1-highmem-8" },
  { value: "n1-highmem-16", label: "n1-highmem-16" },
  { value: "n1-highmem-32", label: "n1-highmem-32" },
  { value: "n1-highcpu-8", label: "n1-highcpu-8" },
  { value: "n1-highcpu-16", label: "n1-highcpu-16" },
  { value: "n1-highcpu-32", label: "n1-highcpu-32" },
];


const clusterVersionOptions = [{ value: "1.27", label: "v1.27" }];

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
  gpuModal?: boolean;
};

const VALID_CIDR_RANGE_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(8|9|1\d|2[0-8])$/;


const GCPProvisionerSettings: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [step, setStep] = useState(0);
  const [createStatus, setCreateStatus] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [region, setRegion] = useState(locationOptions[0].value);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [clusterNetworking, setClusterNetworking] = useState(defaultClusterNetworking);
  const [clusterVersion, setClusterVersion] = useState(clusterVersionOptions[0].value);
  const [instanceType, setInstanceType] = useState(instanceTypes[0].value);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const [preflightData, setPreflightData] = useState(null)
  const [preflightFailed, setPreflightFailed] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [preflightError, setPreflightError] = useState<string>("")
  const [gpuMinInstances, setGpuMinInstances] = useState(1);
  const [gpuMaxInstances, setGpuMaxInstances] = useState(5);
  const [gpuInstanceType, setGpuInstanceType] = useState("n1-standard-1");
  const [expandAdvancedCidrs, setAdvancedCidrs] = useState(false);
  const { showIntercomWithMessage } = useIntercom();

  const markStepStarted = async (step: string, region?: string) => {
    try {
      await api.updateOnboardingStep("<token>", { step, provider: "gcp", region }, {
        project_id: currentProject.id,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const getStatus = () => {
    if (isLoading) {
      return <Loading />
    }
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
    if (!region) {
      return "GCP region is required";
    }
    if (!clusterNetworking.cidrRange || !clusterNetworking.controlPlaneCidr || !clusterNetworking.podCidr || !clusterNetworking.serviceCidr) {
      return "CIDR ranges are required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.cidrRange) || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.controlPlaneCidr) || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.podCidr) || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.serviceCidr)) {
      return "CIDR ranges must be in the format of [0-255].[0-255].0.0/16";
    }

    return "";
  }
  const renderAdvancedSettings = () => {
    return (
      <>
        {
          < Heading >
            <ExpandHeader
              onClick={() => setIsExpanded(!isExpanded)}
              isExpanded={isExpanded}
            >
              <i className="material-icons">arrow_drop_down</i>
              Advanced settings
            </ExpandHeader>
          </Heading >
        }
        {
          isExpanded && (
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
              <Spacer y={0.25} />

              <SelectRow
                options={instanceTypes}
                width="350px"
                disabled={isReadOnly}
                value={instanceType}
                scrollBuffer={true}
                dropdownMaxHeight="240px"
                setActiveValue={setInstanceType}
                label="Instance Type"
              />
              <Spacer y={0.25} />

              <InputRow
                width="350px"
                type="string"
                disabled={isReadOnly}
                value={clusterNetworking.cidrRange}
                setValue={(x: string) => setClusterNetworking(new GKENetwork({ ...clusterNetworking, cidrRange: x }))}
                label="VPC CIDR range"
                placeholder="ex: 10.78.0.0/16"
              />
              {
                <Heading>
                  <ExpandHeader
                    onClick={() => {
                      setAdvancedCidrs(!expandAdvancedCidrs);
                    }}
                    isExpanded={expandAdvancedCidrs}
                  >
                    <i className="material-icons">arrow_drop_down</i>
                    Advanced CIDR settings
                  </ExpandHeader>
                </Heading>
              }
              {expandAdvancedCidrs && <>
                <InputRow
                  width="350px"
                  type="string"
                  disabled={isReadOnly}
                  value={clusterNetworking.controlPlaneCidr}
                  setValue={(x: string) => setClusterNetworking(new GKENetwork({ ...clusterNetworking, controlPlaneCidr: x }))}
                  label="Control Plane CIDR range"
                  placeholder="ex: 10.78.0.0/16"
                />
                <InputRow
                  width="350px"
                  type="string"
                  disabled={isReadOnly}
                  value={clusterNetworking.podCidr}
                  setValue={(x: string) => setClusterNetworking(new GKENetwork({ ...clusterNetworking, podCidr: x }))}
                  label="Pod CIDR range"
                  placeholder="ex: 10.78.0.0/16"
                />
                <InputRow
                  width="350px"
                  type="string"
                  disabled={isReadOnly}
                  value={clusterNetworking.serviceCidr}
                  setValue={(x: string) => setClusterNetworking(new GKENetwork({ ...clusterNetworking, serviceCidr: x }))}
                  label="Service CIDR range"
                  placeholder="ex: 10.78.0.0/16"
                />
                <Spacer y={0.25} />
                <Text color="helper">The following ranges will be used: {clusterNetworking.cidrRange}, {clusterNetworking.controlPlaneCidr}, {clusterNetworking.serviceCidr}, {clusterNetworking.podCidr}</Text>
              </>
              }
            </>
          )
        }
      </>
    );
  };

  const statusPreflight = (): string => {


    if (!clusterNetworking.cidrRange) {
      return "VPC CIDR range is required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.cidrRange)
      || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.controlPlaneCidr)
      || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.podCidr)
      || !VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.serviceCidr)
    ) {
      return "VPC CIDR range must be in the format of [0-255].[0-255].0.0/16";
    }

    return "";
  }

  const createClusterObj = (): Contract => {
    const nodePools = [
      new GKENodePool({
        instanceType: "custom-2-4096",
        minInstances: 1,
        maxInstances: 1,
        nodePoolType: GKENodePoolType.GKE_NODE_POOL_TYPE_MONITORING
      }),
      new GKENodePool({
        instanceType: "custom-2-4096",
        minInstances: 1,
        maxInstances: 2,
        nodePoolType: GKENodePoolType.GKE_NODE_POOL_TYPE_SYSTEM
      }),
      new GKENodePool({
        instanceType: instanceType,
        minInstances: 1, // TODO: make these customizable before merging
        maxInstances: 10, // TODO: make these customizable before merging
        nodePoolType: GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION
      }),
    ];

    // Conditionally add the last EKSNodeGroup if gpuModal is enabled
    if (props.gpuModal) {
      nodePools.push(new GKENodePool({
        instanceType: gpuInstanceType,
        minInstances: gpuMinInstances || 0,
        maxInstances: gpuMaxInstances || 5,
        nodePoolType: GKENodePoolType.GKE_NODE_POOL_TYPE_CUSTOM,
      }));
    }


    const data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.GKE,
        cloudProvider: EnumCloudProvider.GCP,
        cloudProviderCredentialsId: props.credentialId,
        kindValues: {
          case: "gkeKind",
          value: new GKE({
            clusterName: clusterName,
            clusterVersion: clusterVersion || clusterVersionOptions[0].value,
            region: region,
            network: new GKENetwork({
              cidrRange: clusterNetworking.cidrRange,
              controlPlaneCidr: clusterNetworking.controlPlaneCidr,
              podCidr: clusterNetworking.podCidr,
              serviceCidr: clusterNetworking.serviceCidr,
            }),
            nodePools
          }),
        },
      }),
    });

    return data
  }


  const createCluster = async () => {

    const err = validateInputs();
    if (err !== "") {
      setErrorMessage(err)
      setErrorDetails("")
      return;
    }
    setIsLoading(true);

    setIsClicked(true);


    try {
      window.dataLayer?.push({
        event: 'provision-attempt',
        data: {
          cloud: 'gcp',
          email: user?.email
        }
      });
    } catch (err) {
      console.log(err);
    }

    const data = createClusterObj();

    if (props.clusterId) {
      data["cluster"]["clusterId"] = props.clusterId;
    }

    try {
      setIsReadOnly(true);
      setErrorMessage("");
      setErrorDetails("")

      if (!props.clusterId) {
        markStepStarted("provisioning-started", region);
      }

      const res = await api.createContract("<token>", data, {
        project_id: currentProject.id,
      });

      setErrorMessage("");
      setErrorDetails("");

      // Only refresh and set clusters on initial create
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
          setErrorMessage("Error fetching clusters");
          setErrorDetails(err)
        });

    } catch (err) {
      const errMessage = err.response.data.error.replace("unknown: ", "");
      setIsClicked(false);
      setIsLoading(true);
      showIntercomWithMessage({ message: "I am running into an issue provisioning a cluster." });
      // TODO: handle different error conditions here from preflights
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      setErrorDetails(errMessage)
    } finally {
      setIsReadOnly(false);
      setIsClicked(false);
      setIsLoading(true);

    }

  };

  useEffect(() => {
    setIsReadOnly(
      props.clusterId &&
      (currentCluster?.status === "UPDATING" ||
        currentCluster?.status === "UPDATING_UNAVAILABLE")
    );
    setClusterName(
      `${currentProject.name.substring(0, 10)}-${Math.random()
        .toString(36)
        .substring(2, 6)}`
    );
  }, []);

  useEffect(() => {

    const contract = props.selectedClusterVersion as any;
    if (contract?.cluster) {
      if (contract.cluster?.gkeKind?.nodePools) {
        contract.cluster?.gkeKind?.nodePools.map((nodePool: any) => {
          if (nodePool.nodePoolType === "GKE_NODE_POOL_TYPE_APPLICATION") {
            setMinInstances(nodePool.minInstances);
            setMaxInstances(nodePool.maxInstances);
            setInstanceType(nodePool.instanceType);
          }
        });
      }
      setCreateStatus("");
      setClusterName(contract.cluster.gkeKind?.clusterName);
      setRegion(contract.cluster.gkeKind?.region);
      setClusterVersion(contract.cluster.gkeKind?.clusterVersion);
      const cn = new GKENetwork({
        cidrRange: contract.cluster.gkeKind?.network?.cidrRange,
        controlPlaneCidr: contract.cluster.gkeKind?.network?.controlPlaneCidr,
        podCidr: contract.cluster.gkeKind?.network?.podCidr,
        serviceCidr: contract.cluster.gkeKind?.network?.serviceCidr,
      })
      setClusterNetworking(cn);
    }
  }, [props.selectedClusterVersion]);

  useEffect(() => {
    if (statusPreflight() == "" && !props.clusterId) {
      setStep(1)

      preflightChecks()
    }

  }, [props.selectedClusterVersion, clusterNetworking, region]);

  const preflightChecks = async () => {

    try {
      setIsLoading(true);
      setPreflightData(null);
      setPreflightFailed(true)
      setPreflightError("");
      const data = new PreflightCheckRequest({
        projectId: BigInt(currentProject.id),
        cloudProvider: EnumCloudProvider.GCP,
        cloudProviderCredentialsId: props.credentialId,
        preflightValues: {
          case: "gkePreflightValues",
          value: new GKEPreflightValues({
            network: new GKENetwork({
              cidrRange: clusterNetworking.cidrRange,
              controlPlaneCidr: clusterNetworking.controlPlaneCidr,
              podCidr: clusterNetworking.podCidr,
              serviceCidr: clusterNetworking.serviceCidr,
            })
          })
        }
      });
      const preflightDataResp = await api.legacyPreflightCheck(
        "<token>", data,
        {
          id: currentProject.id,
        }
      )
      // Check if any of the preflight checks has a message
      let hasMessage = false;
      let errors = "Preflight Checks Failed : ";
      for (let check in preflightDataResp?.data?.Msg.preflight_checks) {
        if (preflightDataResp?.data?.Msg.preflight_checks[check]?.message) {
          hasMessage = true;
          errors = errors + check + ", "
        }
      }
      if (hasMessage) {
        showIntercomWithMessage({ message: "I am running into an issue provisioning a cluster." });
        markStepStarted("provisioning-failed", errors);
      }
      // If none of the checks have a message, set setPreflightFailed to false
      if (!hasMessage) {
        setPreflightFailed(false);
        setStep(2);
      }
      setPreflightData(preflightDataResp?.data?.Msg);
      setIsLoading(false)
    } catch (err) {
      setPreflightError(err)
      setIsLoading(false)
      setPreflightFailed(true);
    }
  }

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <VerticalSteps
          currentStep={step}
          steps={[
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
                label="📍 GCP location" />
              {renderAdvancedSettings()}

            </>,
            <>
              <PreflightChecks provider='GCP' preflightData={preflightData} error={preflightError} />
              <Spacer y={.5} />
              {(preflightFailed && preflightData || preflightError) &&
                <>
                  {!preflightError && <Text color="helper">
                    Preflight checks for the account didn't pass. Please fix the issues and retry.
                  </Text>}
                  < Button
                    // disabled={isDisabled()}
                    disabled={isLoading}
                    onClick={preflightChecks}
                  >
                    Retry Checks
                  </Button>
                </>
              }
            </>,
            <>
              <Text size={16}>Provision your cluster</Text>
              <Spacer y={1} />
              <Button
                disabled={isDisabled() || isLoading || preflightFailed || statusPreflight() != ""}
                onClick={createCluster}
                status={getStatus()}
              >
                Provision
              </Button><Spacer y={1} /></>
          ].filter((x) => x)}
        />
      );
    }

    if (props.gpuModal) {
      return (
        <>
          <Select
            options={gpuMachineTypeOptions}
            width="350px"
            disabled={isReadOnly}
            value={gpuInstanceType}
            setValue={(x: string) => {
              setGpuInstanceType(x)
            }
            }
            label="GPU Instance type"
          />
          <Spacer y={1} />
          <InputSlider
            label="Max Instances: "
            unit="nodes"
            min={0}
            max={5}
            step={1}
            width="350px"
            disabled={isReadOnly || isLoading}
            value={gpuMaxInstances.toString()}
            setValue={(x: number) => {
              setGpuMaxInstances(x)
            }}
          />
          <Button
            disabled={isDisabled() || isLoading}
            onClick={createCluster}
            status={getStatus()}
          >
            Provision
          </Button>

          <Spacer y={.5} />
        </>
      )
    }
    // If settings, update full form
    return (
      <>
        <StyledForm>
          <Heading isAtTop>GCP configuration</Heading>
          <SelectRow
            options={locationOptions}
            width="350px"
            disabled={true}
            value={region}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setRegion}
            label="📍 Google Cloud Region"
          />
          <Spacer y={1} />
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
          <Spacer y={1} />
          <SelectRow
            options={instanceTypes}
            width="350px"
            disabled={isReadOnly}
            value={instanceType}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setInstanceType}
            label="Instance Type"
          />
        </StyledForm>

        <Button
          disabled={isDisabled() || isLoading}
          onClick={createCluster}
          status={getStatus()}
        >
          Provision
        </Button>

        {
          (!currentProject?.enable_reprovision && props.clusterId) &&
          <>
            <Spacer y={1} />
            <Text>Updates to the cluster are disabled on this project. Enable re-provisioning by contacting <a href="mailto:support@porter.run">Porter Support</a>.</Text>
          </>
        }
      </>
    );
  };

  return (
    <>
      {renderForm()}


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

const errorMessageToModal = (errorMessage: string) => {
  switch (errorMessage) {
    default:
      return null;
  }
};

const ExpandHeader = styled.div<{ isExpanded: boolean }>`
              display: flex;
              align-items: center;
              cursor: pointer;
  > i {
                margin - right: 7px;
              margin-left: -7px;
              transform: ${(props) =>
    props.isExpanded ? "rotate(0deg)" : "rotate(-90deg)"};
              transition: transform 0.1s ease;
  }
              `;
