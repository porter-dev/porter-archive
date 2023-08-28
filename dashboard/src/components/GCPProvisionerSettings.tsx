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

const locationOptions = [
  { value: "us-east1", label: "us-east1" },
];

const defaultClusterNetworking = new GKENetwork({
  cidrRange: "10.78.0.0/16",
  controlPlaneCidr: "10.77.0.0/28",
  podCidr: "10.76.0.0/16",
  serviceCidr: "10.75.0.0/16",
});

const defaultClusterVersion = "1.25";


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
  const [clusterNetworking, setClusterNetworking] = useState(defaultClusterNetworking);
  const [clusterVersion, setClusterVersion] = useState(defaultClusterVersion);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const [detected, setDetected] = useState<Detected | undefined>(undefined);
  const [preflightData, setPreflightData] = useState({})
  const [preflightFailed, setPreflightFailed] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false);

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
    if (!clusterNetworking.cidrRange) {
      return "VPC CIDR range is required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.cidrRange)) {
      return "VPC CIDR range must be in the format of [0-255].[0-255].0.0/16";
    }

    return "";
  }

  const statusPreflight = (): string => {


    if (!clusterNetworking.cidrRange) {
      return "VPC CIDR range is required";
    }
    if (!VALID_CIDR_RANGE_PATTERN.test(clusterNetworking.cidrRange)) {
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
            clusterVersion: clusterVersion || defaultClusterVersion,
            region: region,
            network: new GKENetwork({
              cidrRange: clusterNetworking.cidrRange || defaultClusterNetworking.cidrRange,
              controlPlaneCidr: defaultClusterNetworking.controlPlaneCidr,
              podCidr: defaultClusterNetworking.podCidr,
              serviceCidr: defaultClusterNetworking.serviceCidr,
            }),
            nodePools: [
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
                instanceType: "custom-2-4096",
                minInstances: 1, // TODO: make these customizable before merging
                maxInstances: 10, // TODO: make these customizable before merging
                nodePoolType: GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION
              }),

            ],
          }),
        },
      }),
    });

    if (preflightData) {
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
        // TODO: handle different error conditions here from preflights
        setErrorMessage(DEFAULT_ERROR_MESSAGE);
        setErrorDetails(errMessage)
      } finally {
        setIsReadOnly(false);
        setIsClicked(false);
      }
    } else {
      setIsClicked(false);
      // TODO: handle different error conditions here from preflights
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      setErrorDetails("Could not perform Preflight Checks ")
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
      if (contract.cluster.gkeKind.nodePools) {
        contract.cluster.gkeKind.nodePools.map((nodePool: any) => {
          if (nodePool.nodePoolType === "NODE_POOL_TYPE_APPLICATION") {
            setMinInstances(nodePool.minInstances);
            setMaxInstances(nodePool.maxInstances);
          }
        });
      }
      setCreateStatus("");
      setClusterName(contract.cluster.gkeKind.clusterName);
      setRegion(contract.cluster.gkeKind.region);
      setClusterVersion(contract.cluster.gkeKind.clusterVersion);
      let cn = new GKENetwork({
        cidrRange: contract.cluster.gkeKind.clusterNetworking?.cidrRange || defaultClusterNetworking.cidrRange,
        controlPlaneCidr: defaultClusterNetworking.controlPlaneCidr,
        podCidr: defaultClusterNetworking.podCidr,
        serviceCidr: defaultClusterNetworking.serviceCidr,
      })
      setClusterNetworking(cn);
    }
  }, [props.selectedClusterVersion]);

  useEffect(() => {
    if (statusPreflight() == "" && !props.clusterId) {
      preflightChecks()
    }

  }, [props.selectedClusterVersion, clusterNetworking]);

  const preflightChecks = async () => {
    setIsLoading(true);


    var data = new PreflightCheckRequest({
      projectId: BigInt(currentProject.id),
      cloudProvider: EnumCloudProvider.GCP,
      cloudProviderCredentialsId: props.credentialId,
      preflightValues: {
        case: "gkePreflightValues",
        value: new GKEPreflightValues({
          network: new GKENetwork({
            cidrRange: clusterNetworking.cidrRange || defaultClusterNetworking.cidrRange,
            controlPlaneCidr: defaultClusterNetworking.controlPlaneCidr,
            podCidr: defaultClusterNetworking.podCidr,
            serviceCidr: defaultClusterNetworking.serviceCidr,
          })
        })
      }
    });
    const preflightDataResp = await api.preflightCheck(
      "<token>", data,
      {
        id: currentProject.id,
      }
    )
    setPreflightData(preflightDataResp?.data?.Msg);
    setIsLoading(false)

  }

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
            value={clusterNetworking.cidrRange}
            setValue={(x: string) => setClusterNetworking(new GKENetwork({ ...clusterNetworking, cidrRange: x }))}
            label="VPC CIDR range"
            placeholder="ex: 10.78.0.0/16"
          />
          <Spacer y={0.25} />
          <Text color="helper">The following ranges will be used: {clusterNetworking.cidrRange}, {clusterNetworking.controlPlaneCidr}, {clusterNetworking.serviceCidr}, {clusterNetworking.podCidr}</Text>
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

      {props.credentialId && (<>

        {isLoading ?
          <>
            <Placeholder>
              <Loading />
            </Placeholder>
            <Spacer y={1} />
          </>
          :
          <>
            {(!props.clusterId) &&
              <>
                <PreflightChecks preflightData={preflightData} setPreflightFailed={setPreflightFailed} />
                <Spacer y={1} />
              </>
            }
          </>
        }

      </>
      )}

      <Button
        disabled={isDisabled() || isLoading || preflightFailed}
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

const errorMessageToModal = (errorMessage: string) => {
  switch (errorMessage) {
    default:
      return null;
  }
};

const AppearingDiv = styled.div<{ color?: string }>`
        animation: floatIn 0.5s;
        animation-fill-mode: forwards;
        display: flex;
        flex-direction: column;
        color: ${(props) => props.color || "#ffffff44"};
        margin-left: 10px;
        @keyframes floatIn {
          from {
          opacity: 0;
        transform: translateY(20px);
    }
        to {
          opacity: 1;
        transform: translateY(0px);
    }
  }
        `;
const StatusIcon = styled.img`
        height: 14px;
        `;

const CheckItemContainer = styled.div`
        display: flex;
        flex-direction: column;
        border: 1px solid ${props => props.theme.border};
        border-radius: 5px;
        font-size: 13px;
        width: 100%;
        margin-bottom: 10px;
        padding-left: 10px;
        cursor: ${props => (props.hasMessage ? 'pointer' : 'default')};
        background: ${props => props.theme.clickable.bg};

        `;

const CheckItemTop = styled.div`
        display: flex;
        align-items: center;
        padding: 10px;
        background: ${props => props.theme.clickable.bg};
        `;

const ExpandIcon = styled.i<{ isExpanded: boolean }>`
        margin-left: 8px;
        color: #ffffff66;
        font-size: 20px;
        cursor: pointer;
        border-radius: 20px;
        transform: ${props => props.isExpanded ? "" : "rotate(-90deg)"};
        `;