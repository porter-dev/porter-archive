import React, { useContext, useEffect, useState } from "react";
import {
  AWSClusterNetwork,
  Cluster,
  Contract,
  EKS,
  EKSLogging,
  EKSNodeGroup,
  EKSPreflightValues,
  EnumCloudProvider,
  EnumKubernetesKind,
  LoadBalancer,
  LoadBalancerType,
  NodeGroupType,
  PreflightCheckRequest,
  QuotaIncreaseRequest,
  type EnumQuotaIncrease,
} from "@porter-dev/api-contracts";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import SelectRow from "components/form-components/SelectRow";
import { OFState } from "main/home/onboarding/state";
import { useIntercom } from "lib/hooks/useIntercom";

import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import { type ClusterType, type ClusterState } from "shared/types";
import { PREFLIGHT_TO_ENUM } from "shared/util";
import info from "assets/info-outlined.svg";
import healthy from "assets/status-healthy.png";

import Loading from "./Loading";
import Button from "./porter/Button";
import Checkbox from "./porter/Checkbox";
import Icon from "./porter/Icon";
import Input from "./porter/Input";
import Select from "./porter/Select";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";
import Tooltip from "./porter/Tooltip";
import VerticalSteps from "./porter/VerticalSteps";
import PreflightChecks from "./PreflightChecks";
import { Integer } from "type-fest";
import InputSlider from "./porter/InputSlider";
import GPUProvisionSettings from "./GPUProvisionSettings";


const regionOptions = [
  { value: "us-east-1", label: "US East (N. Virginia) us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) us-east-2" },
  { value: "us-west-1", label: "US West (N. California) us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) us-west-2" },
  { value: "af-south-1", label: "Africa (Cape Town) af-south-1" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong) ap-east-1" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) ap-south-1" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul) ap-northeast-2" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) ap-southeast-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) ap-northeast-1" },
  { value: "ca-central-1", label: "Canada (Central) ca-central-1" },
  { value: "eu-central-1", label: "Europe (Frankfurt) eu-central-1" },
  { value: "eu-west-1", label: "Europe (Ireland) eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) eu-west-2" },
  { value: "eu-south-1", label: "Europe (Milan) eu-south-1" },
  { value: "eu-west-3", label: "Europe (Paris) eu-west-3" },
  { value: "eu-north-1", label: "Europe (Stockholm) eu-north-1" },
  { value: "me-south-1", label: "Middle East (Bahrain) me-south-1" },
  { value: "sa-east-1", label: "South America (São Paulo) sa-east-1" },
];

// IMPORTANT: when adding more machineTypeOptions here, please make sure that you also enter their resources in useClusterResourceLimits.ts
const machineTypeOptions = [
  { value: "t3.medium", label: "t3.medium" },
  { value: "t3.large", label: "t3.large" },
  { value: "t3.xlarge", label: "t3.xlarge" },
  { value: "t3.2xlarge", label: "t3.2xlarge" },
  { value: "t3a.medium", label: "t3a.medium" },
  { value: "t3a.large", label: "t3a.large" },
  { value: "t3a.xlarge", label: "t3a.xlarge" },
  { value: "t3a.2xlarge", label: "t3a.2xlarge" },
  { value: "c6i.large", label: "c6i.large" },
  { value: "c6i.xlarge", label: "c6i.xlarge" },
  { value: "c6i.2xlarge", label: "c6i.2xlarge" },
  { value: "c6i.4xlarge", label: "c6i.4xlarge" },
  { value: "c6i.8xlarge", label: "c6i.8xlarge" },
  { value: "c6a.large", label: "c6a.large" },
  { value: "c6a.2xlarge", label: "c6a.2xlarge" },
  { value: "c6a.4xlarge", label: "c6a.4xlarge" },
  { value: "c6a.8xlarge", label: "c6a.8xlarge" },
  { value: "r6i.large", label: "r6i.large" },
  { value: "r6i.xlarge", label: "r6i.xlarge" },
  { value: "r6i.2xlarge", label: "r6i.2xlarge" },
  { value: "r6i.4xlarge", label: "r6i.4xlarge" },
  { value: "r6i.8xlarge", label: "r6i.8xlarge" },
  { value: "r6i.12xlarge", label: "r6i.12xlarge" },
  { value: "r6i.16xlarge", label: "r6i.16xlarge" },
  { value: "r6i.24xlarge", label: "r6i.24xlarge" },
  { value: "r6i.32xlarge", label: "r6i.32xlarge" },
  { value: "g4dn.xlarge", label: "g4dn.xlarge" },
  { value: "m5n.large", label: "m5n.large" },
  { value: "m5n.xlarge", label: "m5n.xlarge" },
  { value: "m5n.2xlarge", label: "m5n.2xlarge" },
];

const defaultCidrVpc = "10.78.0.0/16";
const defaultCidrServices = "172.20.0.0/16";
const defaultClusterVersion = "v1.24.0";

const initialClusterState: ClusterState = {
  clusterName: "",
  awsRegion: "us-east-1",
  machineType: "t3.medium",
  guardDutyEnabled: false,
  kmsEncryptionEnabled: false,
  loadBalancerType: false,
  wildCardDomain: "",
  IPAllowList: "",
  wafV2Enabled: false,
  awsTags: "",
  wafV2ARN: "",
  certificateARN: "",
  minInstances: 1,
  maxInstances: 10,
  additionalNodePolicies: [],
  cidrRangeVPC: defaultCidrVpc,
  cidrRangeServices: defaultCidrServices,
  clusterVersion: defaultClusterVersion,
  gpuInstanceType: "g4dn.xlarge",
  gpuMinInstances: 1,
  gpuMaxInstances: 5,
};

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number | null;
  closeModal?: () => void;
  gpuModal?: boolean;
};

const ProvisionerSettings: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [step, setStep] = useState(0);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preflightData, setPreflightData] = useState(null);
  const [preflightFailed, setPreflightFailed] = useState<boolean>(true);
  const [preflightError, setPreflightError] = useState<string>("");
  const [showHelpMessage, setShowHelpMessage] = useState(true);
  const [quotaIncrease, setQuotaIncrease] = useState<EnumQuotaIncrease[]>([]);
  const [showEmailMessage, setShowEmailMessage] = useState(false);
  const { showIntercomWithMessage } = useIntercom();
  const [clusterState, setClusterState] = useState(initialClusterState);
  const [isExpanded, setIsExpanded] = useState(false);
  const [controlPlaneLogs, setControlPlaneLogs] = useState<EKSLogging>(
    new EKSLogging()
  );

  const markStepStarted = async (
    step: string,
    errMessage?: string
  ): Promise<void> => {
    try {
      await api.updateOnboardingStep(
        "<token>",
        {
          step,
          error_message: errMessage,
          region: clusterState.awsRegion,
          provider: "aws",
        },
        {
          project_id: currentProject ? currentProject.id : 0,
        }
      );
    } catch (err) { }
  };

  const getStatus = (): React.ReactNode => {
    if (isLoading) {
      return <Loading />;
    }
    if (isReadOnly && props.provisionerError === "") {
      return "Provisioning is still in progress...";
    }
    return undefined;
  };
  const validateInput = (wildCardDomainer: string): false | string => {
    if (!wildCardDomainer) {
      return "Required for ALB Load Balancer";
    }
    if (wildCardDomainer?.charAt(0) === "*") {
      return "Wildcard domain cannot start with *";
    }
    return false;
  };
  function validateIPInput(IPAllowList: string): boolean {
    // This regular expression checks for an IP address with a subnet mask.
    const regex =
      /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!IPAllowList) {
      return false;
    }
    // Split the input string by comma and remove any empty elements
    const ipAddresses = IPAllowList?.split(",").filter(Boolean);
    // Validate each IP address
    for (const ip of ipAddresses) {
      if (!regex.test(ip.trim())) {
        // If any IP is invalid, return true (error)
        return true;
      }
    }
    // If all IPs are valid, return false (no error)
    return false;
  }
  function validateTags(awsTags: string): boolean {
    // Regular expression t o check for a key-value pair format "key=value"
    const regex = /^[a-zA-Z0-9]+=[a-zA-Z0-9]+$/;
    // Split the input string by comma and remove any empty elements
    const tags = awsTags.split(",").filter(Boolean);
    // Validate each tag
    for (const tag of tags) {
      if (!regex.test(tag.trim())) {
        // If any tag is invalid, return true (error)
        return true;
      }
    }
    // If all tags are valid, return false (no error)
    return false;
  }
  const clusterNameDoesNotExist = (): boolean => {
    return !clusterState.clusterName;
  };
  const userProvisioning = (): boolean => {
    // If the cluster is updating or updating unavailabe but there are no errors do not allow re-provisioning
    return isReadOnly && props.provisionerError === "";
  };

  const isDisabled = (): boolean | undefined => {
    return (
      clusterNameDoesNotExist() ||
      userProvisioning() ||
      isClicked ||
      (currentCluster && !currentProject?.enable_reprovision)
    );
  };
  function convertStringToTags(tagString: string): Record<string, string> {
    if (typeof tagString !== "string" || tagString.trim() === "") {
      return {};
    }

    // Split the input string by comma, then reduce the resulting array to an object
    const tags = tagString.split(",").reduce<Record<string, string>>((obj, item) => {
      // Split each item by "=", and trim whitespace from both key and value
      const [key, value] = item.split("=").map(part => part.trim());

      // Only add the key-value pair to the object if both key and value are present
      if (key && value) {
        obj[key] = value;
      }

      return obj;
    }, {});

    return tags;
  }
  const handleClusterStateChange = <K extends keyof ClusterState>(
    key: K,
    value: ClusterState[K]
  ): void => {
    setClusterState((prevState: ClusterState) => ({
      ...prevState,
      [key]: value,
    }));
  };
  const createClusterObj = (): Contract => {
    const loadBalancerObj = new LoadBalancer({});
    loadBalancerObj.loadBalancerType = LoadBalancerType.NLB;
    if (clusterState.loadBalancerType) {
      loadBalancerObj.loadBalancerType = LoadBalancerType.ALB;
      loadBalancerObj.wildcardDomain = clusterState.wildCardDomain;

      if (clusterState.awsTags) {
        loadBalancerObj.tags = convertStringToTags(clusterState.awsTags);
      }
      if (clusterState.IPAllowList) {
        loadBalancerObj.allowlistIpRanges = clusterState.IPAllowList;
      }
      if (clusterState.wafV2Enabled) {
        loadBalancerObj.enableWafv2 = clusterState.wafV2Enabled;
      } else {
        loadBalancerObj.enableWafv2 = false;
      }
      if (clusterState.wafV2ARN) {
        loadBalancerObj.wafv2Arn = clusterState.wafV2ARN;
      }
      if (clusterState.certificateARN) {
        loadBalancerObj.additionalCertificateArns =
          clusterState.certificateARN.split(",");
      }
    }


    const nodeGroups = [
      new EKSNodeGroup({
        instanceType: "t3.medium",
        minInstances: 1,
        maxInstances: 5,
        nodeGroupType: NodeGroupType.SYSTEM,
        isStateful: false,
        additionalPolicies: clusterState.additionalNodePolicies,
      }),
      new EKSNodeGroup({
        instanceType: "t3.large",
        minInstances: 1,
        maxInstances: 1,
        nodeGroupType: NodeGroupType.MONITORING,
        isStateful: true,
        additionalPolicies: clusterState.additionalNodePolicies,
      }),
      new EKSNodeGroup({
        instanceType: clusterState.machineType,
        minInstances: clusterState.minInstances || 1,
        maxInstances: clusterState.maxInstances || 10,
        nodeGroupType: NodeGroupType.APPLICATION,
        isStateful: false,
        additionalPolicies: clusterState.additionalNodePolicies,
      }),
    ];

    // Conditionally add the last EKSNodeGroup if gpuModal is enabled
    if (props.gpuModal) {
      nodeGroups.push(new EKSNodeGroup({
        instanceType: clusterState.gpuInstanceType,
        minInstances: clusterState.gpuMinInstances || 1,
        maxInstances: clusterState.gpuMaxInstances || 5,
        nodeGroupType: NodeGroupType.CUSTOM,
        isStateful: false,
        additionalPolicies: clusterState.additionalNodePolicies,
      }));
    }


    const data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.EKS,
        cloudProvider: EnumCloudProvider.AWS,
        cloudProviderCredentialsId: String(props.credentialId),
        kindValues: {
          case: "eksKind",
          value: new EKS({
            clusterName: clusterState.clusterName,
            clusterVersion: clusterState.clusterVersion || defaultClusterVersion,
            cidrRange: clusterState.cidrRangeVPC || defaultCidrVpc, // deprecated in favour of network.cidrRangeVPC: can be removed after december 2023
            region: clusterState.awsRegion,
            loadBalancer: loadBalancerObj,
            logging: controlPlaneLogs,
            enableGuardDuty: clusterState.guardDutyEnabled,
            enableKmsEncryption: clusterState.kmsEncryptionEnabled,
            network: new AWSClusterNetwork({
              vpcCidr: clusterState.cidrRangeVPC || defaultCidrVpc,
              serviceCidr: clusterState.cidrRangeServices || defaultCidrServices,
            }),
            nodeGroups,
          }),
        },
      }),
    });
    return data;
  };

  const createCluster = async (): Promise<void> => {
    setIsLoading(true);
    setIsClicked(true);
    const data = createClusterObj();
    if (props.clusterId) {
      data.cluster.clusterId = props.clusterId;
    }

    try {
      setIsReadOnly(true);
      if (!props.clusterId) {
        void markStepStarted("pre-provisioning-check-started");
      }

      const res = await api.createContract("<token>", data, {
        project_id: currentProject.id,
      });

      if (!props.clusterId) {
        void markStepStarted("provisioning-started");
      }

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
          window.location.reload();
        })
        .catch((err) => {
          if (err) {
            // setHasFinishedOnboarding(true);
            OFState.actions.goTo("clean_up");
            pushFiltered(props, "/cluster-dashboard", ["project_id"], {});
          }
        });
      // }
      if (props?.closeModal) {
        props?.closeModal();
      }
    } catch (err) {
      const errMessage = err.response.data?.error.replace("unknown: ", "");
      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      setIsLoading(false);
      void markStepStarted("provisioning-failed", errMessage);

      // enable edit again only in the case of an error
      setIsClicked(false);
      setIsReadOnly(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsReadOnly(
      props.clusterId &&
      (currentCluster.status === "UPDATING" ||
        currentCluster.status === "UPDATING_UNAVAILABLE")
    );
    handleClusterStateChange(
      "clusterName",
      `${currentProject.name}-cluster-${Math.random()
        .toString(36)
        .substring(2, 8)}`
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = props.selectedClusterVersion as any;
    // Unmarshall Contract here
    if (contract?.cluster) {
      const eksValues: EKS = contract.cluster?.eksKind as EKS;
      if (eksValues == null) {
        return;
      }

      eksValues.nodeGroups.forEach((nodeGroup: EKSNodeGroup) => {
        if (
          nodeGroup.nodeGroupType.toString() === "NODE_GROUP_TYPE_APPLICATION"
        ) {
          handleClusterStateChange("machineType", nodeGroup.instanceType);
          handleClusterStateChange("minInstances", nodeGroup.minInstances);
          handleClusterStateChange("maxInstances", nodeGroup.maxInstances);
        }

        if (nodeGroup.additionalPolicies?.length > 0) {
          handleClusterStateChange(
            "additionalNodePolicies",
            nodeGroup.additionalPolicies
          );
        }
      });

      handleClusterStateChange("clusterName", eksValues.clusterName);
      handleClusterStateChange("awsRegion", eksValues.region);
      handleClusterStateChange("clusterVersion", eksValues.clusterVersion);
      handleClusterStateChange(
        "cidrRangeVPC",
        eksValues.cidrRange ?? eksValues.network?.vpcCidr ?? defaultCidrVpc
      );
      handleClusterStateChange(
        "cidrRangeServices",
        eksValues.network?.serviceCidr ?? defaultCidrServices
      );

      if (eksValues.loadBalancer != null) {
        handleClusterStateChange(
          "IPAllowList",
          eksValues.loadBalancer.allowlistIpRanges
        );
        handleClusterStateChange(
          "wildCardDomain",
          eksValues.loadBalancer.wildcardDomain
        );

        const awsTags = eksValues.loadBalancer?.tags
          ? Object.entries(eksValues.loadBalancer?.tags)
            .map(([key, value]) => `${key}=${value}`)
            .join(",")
          : "";
        handleClusterStateChange("awsTags", awsTags);

        const loadBalancerType =
          eksValues.loadBalancer?.loadBalancerType?.toString() ===
          "LOAD_BALANCER_TYPE_ALB";
        handleClusterStateChange("loadBalancerType", loadBalancerType);
        handleClusterStateChange("wafV2ARN", eksValues.loadBalancer?.wafv2Arn);
        handleClusterStateChange(
          "wafV2Enabled",
          eksValues.loadBalancer?.enableWafv2
        );
      }

      if (eksValues.logging != null) {
        const logging = new EKSLogging({
          enableApiServerLogs: eksValues.logging.enableApiServerLogs,
          enableAuditLogs: eksValues.logging.enableAuditLogs,
          enableAuthenticatorLogs: eksValues.logging.enableAuthenticatorLogs,
          enableControllerManagerLogs:
            eksValues.logging.enableControllerManagerLogs,
          enableSchedulerLogs: eksValues.logging.enableSchedulerLogs,
        });
        setControlPlaneLogs(logging);
      }

      handleClusterStateChange("guardDutyEnabled", eksValues.enableGuardDuty);
      handleClusterStateChange(
        "kmsEncryptionEnabled",
        eksValues.enableKmsEncryption
      );
    }
  }, [isExpanded, props.selectedClusterVersion]);

  useEffect(() => {
    if (!props.clusterId) {
      if (clusterState.clusterName != "") {
        setStep(1);
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          preflightChecks();
          // Handle the resolved value if necessary
        } catch (error) {
          if (error) {
            setStep(0);
          }
        }

      }
    }
  }, [clusterState]);

  const proceedToProvision = async (): Promise<void> => {
    setShowEmailMessage(true);
    void markStepStarted("requested-quota-increase");
    setStep(2);
  };
  const requestQuotasAndProvision = async (): Promise<void> => {
    await requestQuotaIncrease();
    await createCluster();
  };
  const requestQuotaIncrease = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = new QuotaIncreaseRequest({
        projectId: BigInt(currentProject.id),
        cloudProvider: EnumCloudProvider.AWS,
        cloudProviderCredentialsId: props.credentialId,
        preflightValues: {
          case: "eksPreflightValues",
          value: new EKSPreflightValues({
            region: clusterState.awsRegion,
          }),
        },
        quotaIncreases: quotaIncrease,
      });
      await api.requestQuotaIncrease("<token>", data, {
        id: currentProject.id,
      });

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  };
  const preflightChecks = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setPreflightData(null);
      setPreflightFailed(true);
      setPreflightError("");
      setShowEmailMessage(false);

      const contract = createClusterObj();
      const data = new PreflightCheckRequest({
        contract,
      });
      const preflightDataResp = await api.preflightCheck("<token>", data, {
        id: currentProject.id,
      });
      // Check if any of the preflight checks has a message
      let hasMessage = false;
      let errors = "Preflight Checks Failed : ";
      const quotas: EnumQuotaIncrease[] = [];
      for (const check in preflightDataResp?.data?.Msg.preflight_checks) {
        if (preflightDataResp?.data?.Msg.preflight_checks[check]?.message) {
          quotas.push(PREFLIGHT_TO_ENUM[check]);
          hasMessage = true;
          errors = errors + check + ", ";
        }
      }
      setQuotaIncrease(quotas);
      // If none of the checks have a message, set setPreflightFailed to false
      if (hasMessage) {
        showIntercomWithMessage({
          message: "I am running into an issue provisioning a cluster.",
        });
        void markStepStarted("provisioning-failed", errors);
      }
      if (!hasMessage) {
        setPreflightFailed(false);
        setStep(2);
      }
      setPreflightData(preflightDataResp?.data?.Msg);
      setIsLoading(false);
    } catch (err) {
      setPreflightError(err);
      setIsLoading(false);
      setPreflightFailed(true);
    }
  };
  const renderAdvancedSettings = (): JSX.Element => {
    return (
      <>
        {
          <Heading>
            <ExpandHeader
              onClick={() => {
                setIsExpanded(!isExpanded);
              }}
              isExpanded={isExpanded}
            >
              <i className="material-icons">arrow_drop_down</i>
              Advanced settings
            </ExpandHeader>
          </Heading>
        }
        {isExpanded && (
          <>
            {user?.isPorterUser && (
              <Input
                width="350px"
                type="string"
                value={clusterState.clusterVersion}
                disabled={true}
                setValue={(x: string) => {
                  handleClusterStateChange("clusterVersion", x);
                }}
                label="Cluster version (only shown to porter.run emails)"
                placeholder={""}
              />
            )}
            <Spacer y={1} />
            <Select
              options={machineTypeOptions}
              width="350px"
              disabled={isReadOnly}
              value={clusterState.machineType}
              setValue={(x: string) => {
                handleClusterStateChange("machineType", x);
              }}
              label="Machine type"
            />
            <Spacer y={1} />
            <Input
              width="350px"
              type="number"
              disabled={isReadOnly || isLoading}
              value={clusterState.maxInstances.toString()}
              setValue={(x: string) => {
                const num = parseInt(x, 10);
                if (!isNaN(num)) {
                  handleClusterStateChange("maxInstances", num);
                }
              }}
              label="Maximum number of application nodes"
              placeholder="ex: 1"
            />
            <Spacer y={1} />
            <Input
              width="350px"
              type="number"
              disabled={isReadOnly || isLoading}
              value={clusterState.minInstances.toString()}
              setValue={(x: string) => {
                const num = parseInt(x, 10);
                if (num === undefined) {
                  return;
                }
                handleClusterStateChange("minInstances", num);
              }}
              label="Minimum number of application nodes. If set to 0, no applications will be deployed."
              placeholder="ex: 1"
            />
            <Spacer y={1} />
            <Input
              width="350px"
              type="string"
              value={clusterState.cidrRangeVPC}
              disabled={props.clusterId !== undefined || isLoading}
              setValue={(x: string) => {
                handleClusterStateChange("cidrRangeVPC", x);
              }}
              label="CIDR range for AWS VPC"
              placeholder="ex: 10.78.0.0/16"
            />
            <Spacer y={1} />
            <Input
              width="350px"
              type="string"
              value={clusterState.cidrRangeServices}
              disabled={props.clusterId !== undefined || isLoading}
              setValue={(x: string) => {
                handleClusterStateChange("cidrRangeServices", x);
              }}
              label="CIDR range for Kubernetes internal services"
              placeholder="ex: 172.20.0.0/16"
            />
            {currentProject && (
              <>
                <Spacer y={1} />
                <Checkbox
                  checked={controlPlaneLogs.enableApiServerLogs}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    setControlPlaneLogs(
                      new EKSLogging({
                        ...controlPlaneLogs,
                        enableApiServerLogs:
                          !controlPlaneLogs.enableApiServerLogs,
                      })
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">
                    Enable API Server logs in CloudWatch for this cluster
                  </Text>
                </Checkbox>

                <Spacer y={1} />
                <Checkbox
                  checked={controlPlaneLogs.enableAuditLogs}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    setControlPlaneLogs(
                      new EKSLogging({
                        ...controlPlaneLogs,
                        enableAuditLogs: !controlPlaneLogs.enableAuditLogs,
                      })
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">
                    Enable Audit logs in CloudWatch for this cluster
                  </Text>
                </Checkbox>

                <Spacer y={1} />
                <Checkbox
                  checked={controlPlaneLogs.enableAuthenticatorLogs}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    setControlPlaneLogs(
                      new EKSLogging({
                        ...controlPlaneLogs,
                        enableAuthenticatorLogs:
                          !controlPlaneLogs.enableAuthenticatorLogs,
                      })
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">
                    Enable Authenticator logs in CloudWatch for this cluster
                  </Text>
                </Checkbox>

                <Spacer y={1} />
                <Checkbox
                  checked={controlPlaneLogs.enableControllerManagerLogs}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    setControlPlaneLogs(
                      new EKSLogging({
                        ...controlPlaneLogs,
                        enableControllerManagerLogs:
                          !controlPlaneLogs.enableControllerManagerLogs,
                      })
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">
                    Enable Controller Manager logs in CloudWatch for this
                    cluster
                  </Text>
                </Checkbox>

                <Spacer y={1} />
                <Checkbox
                  checked={controlPlaneLogs.enableSchedulerLogs}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    setControlPlaneLogs(
                      new EKSLogging({
                        ...controlPlaneLogs,
                        enableSchedulerLogs:
                          !controlPlaneLogs.enableSchedulerLogs,
                      })
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">
                    Enable Scheduler logs in CloudWatch for this cluster
                  </Text>
                </Checkbox>

                <Spacer y={1} />
                <Checkbox
                  checked={clusterState.loadBalancerType}
                  disabled={isReadOnly}
                  toggleChecked={() => {
                    if (clusterState.loadBalancerType) {
                      handleClusterStateChange("wildCardDomain", "");
                      handleClusterStateChange("IPAllowList", "");
                      handleClusterStateChange("wafV2ARN", "");
                      handleClusterStateChange("awsTags", "");
                      handleClusterStateChange("certificateARN", "");
                      handleClusterStateChange("wafV2Enabled", false);
                    }

                    handleClusterStateChange(
                      "loadBalancerType",
                      !clusterState.loadBalancerType
                    );
                  }}
                  disabledTooltip={
                    "Wait for provisioning to complete before editing this field."
                  }
                >
                  <Text color="helper">Set Load Balancer Type to ALB</Text>
                </Checkbox>
                <Spacer y={1} />
                {clusterState.loadBalancerType && (
                  <>
                    <FlexCenter>
                      <Input
                        width="350px"
                        disabled={isReadOnly}
                        value={clusterState.wildCardDomain}
                        setValue={(x: string) => {
                          handleClusterStateChange("wildCardDomain", x);
                        }}
                        label="Wildcard domain"
                        placeholder="user-2.porter.run"
                      />
                      <Wrapper>
                        <Tooltip
                          content={
                            "The provided domain should have a wildcard subdomain pointed to the LoadBalancer address. Using testing.porter.run will create a certificate for testing.porter.run with a SAN *.testing.porter.run"
                          }
                          position="right"
                        >
                          <Icon src={info} />
                        </Tooltip>
                      </Wrapper>
                    </FlexCenter>

                    {validateInput(clusterState.wildCardDomain) && (
                      <ErrorInLine>
                        <i className="material-icons">error</i>
                        {validateInput(clusterState.wildCardDomain)}
                      </ErrorInLine>
                    )}
                    <Spacer y={1} />

                    <FlexCenter>
                      <>
                        <Input
                          width="350px"
                          disabled={isReadOnly}
                          value={clusterState.IPAllowList}
                          setValue={(x: string) => {
                            handleClusterStateChange("IPAllowList", x);
                          }}
                          label="IP Allow List"
                          placeholder="160.72.72.58/32,160.72.72.59/32"
                        />
                        <Wrapper>
                          <Tooltip
                            content={
                              "Each range should be a CIDR, including netmask such as 10.1.2.3/21. To use multiple values, they should be comma-separated with no spaces"
                            }
                            position="right"
                          >
                            <Icon src={info} />
                          </Tooltip>
                        </Wrapper>
                      </>
                    </FlexCenter>
                    {validateIPInput(clusterState.IPAllowList) && (
                      <ErrorInLine>
                        <i className="material-icons">error</i>
                        {"Needs to be Comma Separated Valid IP addresses"}
                      </ErrorInLine>
                    )}
                    <Spacer y={1} />

                    <Input
                      width="350px"
                      disabled={isReadOnly}
                      value={clusterState.certificateARN}
                      setValue={(x: string) => {
                        handleClusterStateChange("certificateARN", x);
                      }}
                      label="Certificate ARN"
                      placeholder="arn:aws:acm:REGION:ACCOUNT_ID:certificate/ACM_ID"
                    />
                    <Spacer y={1} />

                    <FlexCenter>
                      <>
                        <Input
                          width="350px"
                          disabled={isReadOnly}
                          value={clusterState.awsTags}
                          setValue={(x: string) => {
                            handleClusterStateChange("awsTags", x);
                          }}
                          label="AWS Tags"
                          placeholder="costcenter=1,environment=10,project=32"
                        />
                        <Wrapper>
                          <Tooltip
                            content={
                              "Each tag should be of the format 'key=value'. To use multiple values, they should be comma-separated with no spaces."
                            }
                            position="right"
                          >
                            <Icon src={info} />
                          </Tooltip>
                        </Wrapper>
                      </>
                    </FlexCenter>
                    {validateTags(clusterState.awsTags) && (
                      <ErrorInLine>
                        <i className="material-icons">error</i>
                        {"Needs to be Comma Separated Valid Tags"}
                      </ErrorInLine>
                    )}

                    <Spacer y={1} />
                    {/* <Checkbox
              checked={accessS3Logs}
              disabled={isReadOnly}
              toggleChecked={() => {
                {
                  console.log(!accessS3Logs)
                }
                setAccessS3Logs(!accessS3Logs)
              }}
              disabledTooltip={"Wait for provisioning to complete before editing this field."}
            >
              <Text color="helper">Access Logs to S3</Text>
            </Checkbox> */}
                    {/* <Spacer y={1} /> */}
                    <Checkbox
                      checked={clusterState.wafV2Enabled}
                      disabled={isReadOnly}
                      toggleChecked={() => {
                        if (clusterState.wafV2Enabled) {
                          handleClusterStateChange("wafV2ARN", "");
                        }
                        handleClusterStateChange(
                          "wafV2Enabled",
                          !clusterState.wafV2Enabled
                        );
                      }}
                      disabledTooltip={
                        "Wait for provisioning to complete before editing this field."
                      }
                    >
                      <Text color="helper">WAFv2 Enabled</Text>
                    </Checkbox>
                    {clusterState.wafV2Enabled && (
                      <>
                        <Spacer y={1} />

                        <FlexCenter>
                          <>
                            <Input
                              width="500px"
                              type="string"
                              label="WAFv2 ARN"
                              disabled={isReadOnly}
                              value={clusterState.wafV2ARN}
                              setValue={(x: string) => {
                                handleClusterStateChange("wafV2ARN", x);
                              }}
                              placeholder="arn:aws:wafv2:REGION:ACCOUNT_ID:regional/webacl/ACL_NAME/RULE_ID"
                            />
                            <Wrapper>
                              <Tooltip
                                content={
                                  'Only Regional WAFv2 is supported. To find your ARN, navigate to the WAF console, click the Gear icon in the top right, and toggle "ARN" to on'
                                }
                                position="right"
                              >
                                <Icon src={info} />
                              </Tooltip>
                            </Wrapper>
                          </>
                        </FlexCenter>

                        {(clusterState.wafV2ARN === undefined ||
                          clusterState.wafV2ARN?.length === 0) && (
                            <ErrorInLine>
                              <i className="material-icons">error</i>
                              {"Required if WafV2 is enabled"}
                            </ErrorInLine>
                          )}
                      </>
                    )}
                    <Spacer y={1} />
                  </>
                )}
                <FlexCenter>
                  <Checkbox
                    checked={clusterState.guardDutyEnabled}
                    disabled={isReadOnly}
                    toggleChecked={() => {
                      handleClusterStateChange(
                        "guardDutyEnabled",
                        !clusterState.guardDutyEnabled
                      );
                    }}
                    disabledTooltip={
                      "Wait for provisioning to complete before editing this field."
                    }
                  >
                    <Text color="helper">
                      Install AWS GuardDuty agent on this cluster (see details
                      to fully enable)
                    </Text>
                    <Spacer x={0.5} inline />
                    <Tooltip
                      content={
                        "In addition to installing the agent, you must enable GuardDuty through your AWS Console and enable EKS Protection in the EKS Protection tab of the GuardDuty console."
                      }
                      position="right"
                    >
                      <Icon src={info} />
                    </Tooltip>
                  </Checkbox>
                </FlexCenter>
                <Spacer y={1} />
                <FlexCenter>
                  <Checkbox
                    checked={clusterState.kmsEncryptionEnabled}
                    disabled={isReadOnly || currentCluster != null}
                    toggleChecked={() => {
                      handleClusterStateChange(
                        "kmsEncryptionEnabled",
                        !clusterState.kmsEncryptionEnabled
                      );
                    }}
                    disabledTooltip={
                      clusterState.kmsEncryptionEnabled
                        ? "KMS encryption can never be disabled."
                        : "Encryption is only supported at cluster creation."
                    }
                  >
                    <Text color="helper">
                      Enable KMS encryption for this cluster
                    </Text>
                    <Spacer x={0.5} inline />
                    <Tooltip
                      content={
                        "KMS encryption can never be disabled. Deletion of the KMS key will permanently place this cluster in a degraded state."
                      }
                      position="right"
                    >
                      <Icon src={info} />
                    </Tooltip>
                  </Checkbox>
                </FlexCenter>
                {clusterState.kmsEncryptionEnabled && (
                  <ErrorInLine>
                    <i className="material-icons">error</i>
                    {
                      "KMS encryption can never be disabled. Deletion of the KMS key will permanently place this cluster in a degraded state."
                    }
                  </ErrorInLine>
                )}
                <Spacer y={1} />
              </>
            )}
          </>
        )}
      </>
    );
  };

  const dismissPreflight = async (): Promise<void> => {
    setShowHelpMessage(false);
    try {
      await preflightChecks();
    } catch (err) {

    }
  }

  const renderForm = (): JSX.Element => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <>
          <VerticalSteps
            currentStep={step}
            steps={[
              <>
                <Text size={16}>Select an AWS region</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  Porter will automatically provision your infrastructure in the
                  specified region.
                </Text>
                <Spacer height="10px" />
                <SelectRow
                  options={regionOptions}
                  width="350px"
                  disabled={isReadOnly || isLoading}
                  value={clusterState.awsRegion}
                  scrollBuffer={true}
                  dropdownMaxHeight="240px"
                  setActiveValue={(x: string) => {
                    handleClusterStateChange("awsRegion", x);
                  }}
                  label="📍 AWS region"
                />
                <>
                  {(user?.isPorterUser || currentProject?.multi_cluster) &&
                    renderAdvancedSettings()}
                </>
              </>,
              <>
                {showEmailMessage ? (
                  <>
                    <CheckItemContainer>
                      <CheckItemTop>
                        <StatusIcon src={healthy} />
                        <Spacer inline x={1} />
                        <Text style={{ marginLeft: "10px", flex: 1 }}>
                          {
                            "Porter will request to increase quotas when you provision"
                          }
                        </Text>
                      </CheckItemTop>
                    </CheckItemContainer>

                  </>) :
                  <>
                    <PreflightChecks
                      provider="AWS"
                      preflightData={preflightData}
                      error={preflightError}
                    />
                    <Spacer y={0.5} />
                    {preflightFailed && preflightData && (
                      <>
                        {(showHelpMessage && currentProject?.quota_increase) ? <>
                          <Text color="helper">
                            Your account currently is blocked from provisioning in {clusterState.awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                          </Text>
                          <Spacer y={.5} />
                          <Text color="helper">
                            Porter can automatically request quota increases on your behalf and email you once the cluster is provisioned.
                          </Text>
                          <Spacer y={.5} />
                          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '15px' }}>
                            <Button
                              disabled={isLoading}
                              onClick={proceedToProvision}

                            >
                              Auto request increase
                            </Button>
                            <Button
                              disabled={isLoading}
                              onClick={dismissPreflight}
                              color="#313539"
                            >
                              I'll do it myself
                            </Button>
                          </div>

                        </> : (
                          <><Text color="helper">
                            Your account currently is blocked from provisioning in {clusterState.awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                          </Text><Spacer y={.5} /><Button
                            disabled={isLoading}
                            onClick={preflightChecks}

                          >
                              Retry checks
                            </Button></>)}
                      </>)}
                  </>}
              </>, <>
                <Text size={16}>Provision your cluster</Text>
                <Spacer y={1} />
                {showEmailMessage && <>
                  <Text color="helper">
                    After your quota requests have been approved by AWS, Porter will email you when your cluster has been provisioned.
                  </Text>
                  <Spacer y={1} />
                </>}
                <Button
                  disabled={(preflightFailed && !showEmailMessage) || isLoading}
                  onClick={showEmailMessage ? requestQuotasAndProvision : createCluster}
                  status={getStatus()}
                >
                  Provision
                </Button>
                <Spacer y={1} /></>
              ,

            ].filter((x) => x)}
          />
        </>
      )
    }

    // If settings, update full form
    if (props.clusterId && props.gpuModal) {
      return (
        <GPUProvisionSettings
          handleClusterStateChange={handleClusterStateChange}
          clusterState={clusterState}
          preflightChecks={preflightChecks}
          isReadOnly={isReadOnly}
          isLoading={isLoading}
          createCluster={createCluster}
          preflightData={preflightData}
          preflightFailed={preflightFailed}
          preflightError={preflightError}
          proceedToProvision={proceedToProvision}
          getStatus={getStatus}
          dismissPreflight={dismissPreflight}
          showHelpMessage={showHelpMessage}
          showEmailMessage={showEmailMessage}
          requestQuotasAndProvision={requestQuotaIncrease}
        />
      )
    }


    return (
      <>
        <StyledForm>
          <Heading isAtTop>EKS configuration</Heading>
          <SelectRow
            options={regionOptions}
            width="350px"
            disabled={isReadOnly || true}
            value={clusterState.awsRegion}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={(x: string) => {
              handleClusterStateChange("awsRegion", x);
            }}
            label="📍 AWS region"
          />
          {renderAdvancedSettings()}
        </StyledForm>
        <Button
          // disabled={isDisabled()}
          disabled={isDisabled() ?? isLoading}
          onClick={createCluster}
          status={getStatus()}
        >
          Provision
        </Button>
      </>
    );
  };

  return (
    <>
      {renderForm()}
      {user.isPorterUser && (
        <>
          <Spacer y={1} />
          <Text color="yellow">Visible to Admin Only</Text>
          <Button color="red" onClick={createCluster} status={getStatus()}>
            Override Provision
          </Button>
        </>
      )}
    </>
  );
};

export default withRouter(ProvisionerSettings);

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

const StyledForm = styled.div`
  position: relative;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
`;

const FlexCenter = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
`;
const Wrapper = styled.div`
  transform: translateY(+13px);
`;

const ErrorInLine = styled.div`
      display: flex;
      align-items: center;
      font-size: 13px;
      color: #ff3b62;
      margin-top: 10px;

  > i {
        font - size: 18px;
      margin-right: 5px;
  }
      `;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  cursor: ${(props) => (props.hasMessage ? "pointer" : "default")};
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const StatusIcon = styled.img`
  height: 14px;
`;
