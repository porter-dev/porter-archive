import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";

import { OFState } from "main/home/onboarding/state";
import api from "shared/api";
import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import info from "assets/info-outlined.svg";

import SelectRow from "components/form-components/SelectRow";
import Heading from "components/form-components/Heading";
import {
  Contract,
  EnumKubernetesKind,
  EnumCloudProvider,
  NodeGroupType,
  EKSNodeGroup,
  EKS,
  Cluster,
  LoadBalancer,
  LoadBalancerType,
  EKSLogging,
  EKSPreflightValues,
  PreflightCheckRequest,
  QuotaIncreaseRequest,
  EnumQuotaIncrease,
  AWSClusterNetwork,
} from "@porter-dev/api-contracts";

import { ClusterType } from "shared/types";
import Button from "./porter/Button";
import Error from "./porter/Error";
import Spacer from "./porter/Spacer";
import Step from "./porter/Step";
import Link from "./porter/Link";
import Text from "./porter/Text";
import Select from "./porter/Select";
import Input from "./porter/Input";
import Checkbox from "./porter/Checkbox";
import Tooltip from "./porter/Tooltip";
import Icon from "./porter/Icon";
import Loading from "./Loading";
import PreflightChecks from "./PreflightChecks";
import Placeholder from "./Placeholder";
import VerticalSteps from "./porter/VerticalSteps";
import Modal from "components/porter/Modal";
import { PREFLIGHT_TO_ENUM } from "shared/util";

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
];

const defaultCidrVpc = "10.78.0.0/16"
const defaultCidrServices = "172.20.0.0/16"
const defaultClusterVersion = "v1.24.0"

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
  closeModal?: () => void;
};

const ProvisionerSettings: React.FC<Props> = (props) => {
  const {
    user,
    currentProject,
    currentCluster,
    setCurrentCluster,
    setShouldRefreshClusters,
  } = useContext(Context);
  const [clusterName, setClusterName] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [machineType, setMachineType] = useState("t3.medium");
  const [guardDutyEnabled, setGuardDutyEnabled] = useState<boolean>(false);
  const [kmsEncryptionEnabled, setKmsEncryptionEnabled] = useState<boolean>(
    false
  );
  const [step, setStep] = useState(0);
  const [loadBalancerType, setLoadBalancerType] = useState(false);
  const [wildCardDomain, setWildCardDomain] = useState("");
  const [IPAllowList, setIPAllowList] = useState<string>("");
  const [controlPlaneLogs, setControlPlaneLogs] = useState<EKSLogging>(
    new EKSLogging()
  );
  //const [accessS3Logs, setAccessS3Logs] = useState<boolean>(false)
  const [wafV2Enabled, setWaf2Enabled] = useState<boolean>(false);
  const [awsTags, setAwsTags] = useState<string>("");
  const [wafV2ARN, setwafV2ARN] = useState("");
  const [certificateARN, seCertificateARN] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [additionalNodePolicies, setAdditionalNodePolicies] = useState<
    string[]
  >([]);
  const [cidrRangeVPC, setCidrRangeVPC] = useState(defaultCidrVpc);
  const [cidrRangeServices, setCidrRangeServices] = useState(defaultCidrServices);
  const [clusterVersion, setClusterVersion] = useState(defaultClusterVersion);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>(undefined);
  const [isClicked, setIsClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preflightData, setPreflightData] = useState(null)
  const [preflightFailed, setPreflightFailed] = useState<boolean>(true)
  const [preflightError, setPreflightError] = useState<string>("")
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [showHelpMessage, setShowHelpMessage] = useState(true);
  const [quotaIncrease, setQuotaIncrease] = useState<EnumQuotaIncrease[]>([]);


  const markStepStarted = async (step: string, errMessage?: string) => {
    try {
      await api.updateOnboardingStep(
        "<token>",
        {
          step,
          error_message: errMessage,
          region: awsRegion,
          provider: "aws",
        },
        {
          project_id: currentProject.id,
        }
      );
    } catch (err) {
      // console.log(err);
    }
  };

  const getStatus = () => {
    if (isLoading) {
      return <Loading />
    }
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
          errorModalContents={errorMessageToModal(errorMessage)}
        />
      );
    }
    return undefined;
  };
  const validateInput = (wildCardDomainer) => {
    if (!wildCardDomainer) {
      return "Required for ALB Load Balancer";
    }
    if (wildCardDomainer?.charAt(0) == "*") {
      return "Wildcard domain cannot start with *";
    }
    return false;
  };
  function validateIPInput(IPAllowList) {
    // This regular expression checks for an IP address with a subnet mask.
    const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!IPAllowList) {
      return false;
    }
    // Split the input string by comma and remove any empty elements
    const ipAddresses = IPAllowList.split(",").filter(Boolean);
    // Validate each IP address
    for (let ip of ipAddresses) {
      if (!regex.test(ip.trim())) {
        // If any IP is invalid, return true (error)
        return true;
      }
    }
    // If all IPs are valid, return false (no error)
    return false;
  }
  function validateTags(awsTags) {
    // Regular expression t o check for a key-value pair format "key=value"
    const regex = /^[a-zA-Z0-9]+=[a-zA-Z0-9]+$/;
    // Split the input string by comma and remove any empty elements
    const tags = awsTags.split(",").filter(Boolean);
    // Validate each tag
    for (let tag of tags) {
      if (!regex.test(tag.trim())) {
        // If any tag is invalid, return true (error)
        return true;
      }
    }
    // If all tags are valid, return false (no error)
    return false;
  }
  const clusterNameDoesNotExist = () => {
    return !clusterName;
  };
  const userProvisioning = () => {
    //If the cluster is updating or updating unavailabe but there are no errors do not allow re-provisioning
    return isReadOnly && props.provisionerError === "";
  };

  const isDisabled = () => {
    return (
      (clusterNameDoesNotExist() || userProvisioning() || isClicked || (currentCluster && !currentProject?.enable_reprovision)
      ))
  };
  function convertStringToTags(tagString) {
    if (typeof tagString !== "string" || tagString.trim() === "") {
      return [];
    }

    // Split the input string by comma, then reduce the resulting array to an object
    const tags = tagString.split(",").reduce((obj, item) => {
      // Split each item by "=",
      const [key, value] = item.split("=");
      // Add the key-value pair to the object
      obj[key] = value;
      return obj;
    }, {});

    return tags;
  }
  const createCluster = async () => {
    setIsLoading(true);
    setIsClicked(true);


    let loadBalancerObj = new LoadBalancer({});
    loadBalancerObj.loadBalancerType = LoadBalancerType.NLB;
    if (loadBalancerType) {
      loadBalancerObj.loadBalancerType = LoadBalancerType.ALB;
      loadBalancerObj.wildcardDomain = wildCardDomain;

      if (awsTags) {
        loadBalancerObj.tags = convertStringToTags(awsTags);
      }
      if (IPAllowList) {
        loadBalancerObj.allowlistIpRanges = IPAllowList;
      }
      if (wafV2Enabled) {
        loadBalancerObj.enableWafv2 = wafV2Enabled;
      } else {
        loadBalancerObj.enableWafv2 = false;
      }
      if (wafV2ARN) {
        loadBalancerObj.wafv2Arn = wafV2ARN;
      }
      if (certificateARN) {
        loadBalancerObj.additionalCertificateArns = certificateARN.split(",");
      }
    }

    let data = new Contract({
      cluster: new Cluster({
        projectId: currentProject.id,
        kind: EnumKubernetesKind.EKS,
        cloudProvider: EnumCloudProvider.AWS,
        cloudProviderCredentialsId: String(props.credentialId),
        kindValues: {
          case: "eksKind",
          value: new EKS({
            clusterName,
            clusterVersion: clusterVersion || defaultClusterVersion,
            cidrRange: cidrRangeVPC || defaultCidrVpc, // deprecated in favour of network.cidrRangeVPC: can be removed after december 2023
            region: awsRegion,
            loadBalancer: loadBalancerObj,
            logging: controlPlaneLogs,
            enableGuardDuty: guardDutyEnabled,
            enableKmsEncryption: kmsEncryptionEnabled,
            network: new AWSClusterNetwork({
              vpcCidr: cidrRangeVPC || defaultCidrVpc,
              serviceCidr: cidrRangeServices || defaultCidrServices,
            }),
            nodeGroups: [
              new EKSNodeGroup({
                instanceType: "t3.medium",
                minInstances: 1,
                maxInstances: 5,
                nodeGroupType: NodeGroupType.SYSTEM,
                isStateful: false,
                additionalPolicies: additionalNodePolicies,
              }),
              new EKSNodeGroup({
                instanceType: "t3.large",
                minInstances: 1,
                maxInstances: 1,
                nodeGroupType: NodeGroupType.MONITORING,
                isStateful: true,
                additionalPolicies: additionalNodePolicies,
              }),
              new EKSNodeGroup({
                instanceType: machineType,
                minInstances: minInstances || 1,
                maxInstances: maxInstances || 10,
                nodeGroupType: NodeGroupType.APPLICATION,
                isStateful: false,
                additionalPolicies: additionalNodePolicies,
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

      // if (!props.clusterId) {
      //   markStepStarted("pre-provisioning-check-started");

      //   await api.preflightCheckAWSUsage(
      //     "<token>",
      //     {
      //       target_arn: props.credentialId,
      //       region: awsRegion,
      //     },
      //     {
      //       id: currentProject.id,
      //     }
      //   );
      // }

      const res = await api.createContract("<token>", data, {
        project_id: currentProject.id,
      });

      if (!props.clusterId) {
        markStepStarted("provisioning-started");
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
        })
        .catch((err) => {
          console.error(err);
        });
      // }
      {
        props?.closeModal &&
          props?.closeModal()
      };

      setErrorMessage(undefined);
    } catch (err) {
      const errMessage = err.response.data?.error.replace("unknown: ", "");
      // hacky, need to standardize error contract with backend
      setIsClicked(false);
      setIsLoading(false)
      if (errMessage.includes("elastic IP")) {
        setErrorMessage(AWS_EIP_QUOTA_ERROR_MESSAGE);
      } else if (errMessage.includes("VPC")) {
        setErrorMessage(AWS_VPC_QUOTA_ERROR_MESSAGE);
      } else if (errMessage.includes("NAT Gateway")) {
        setErrorMessage(AWS_NAT_GATEWAY_QUOTA_ERROR_MESSAGE);
      } else if (errMessage.includes("vCPU")) {
        setErrorMessage(AWS_VCPU_QUOTA_ERROR_MESSAGE);
      } else if (errMessage.includes("AWS account")) {
        setErrorMessage(AWS_LOGIN_ERROR_MESSAGE);
      } else {
        setErrorMessage(DEFAULT_ERROR_MESSAGE);
      }
      markStepStarted("provisioning-failed", errMessage);

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
    setClusterName(
      `${currentProject.name}-cluster-${Math.random()
        .toString(36)
        .substring(2, 8)}`
    );
  }, []);

  useEffect(() => {
    const contract = props.selectedClusterVersion as any;
    if (contract?.cluster) {
      let eksValues: EKS = contract.cluster?.eksKind as EKS;
      if (eksValues == null) {
        return;
      }
      eksValues.nodeGroups.map((nodeGroup: EKSNodeGroup) => {
        if (
          nodeGroup.nodeGroupType.toString() === "NODE_GROUP_TYPE_APPLICATION"
        ) {
          setMachineType(nodeGroup.instanceType);
          setMinInstances(nodeGroup.minInstances);
          setMaxInstances(nodeGroup.maxInstances);
        }

        if (nodeGroup.additionalPolicies?.length > 0) {
          // this shares policies across all node groups, but there is no reason that this can be specific policies per node group
          setAdditionalNodePolicies(nodeGroup.additionalPolicies);
        }
      });
      setClusterName(eksValues.clusterName);
      setAwsRegion(eksValues.region);
      setClusterVersion(eksValues.clusterVersion);
      setCidrRangeVPC(eksValues.cidrRange);
      if (eksValues.network != null) {
        setCidrRangeVPC(eksValues.network?.vpcCidr || defaultCidrVpc);
        setCidrRangeServices(eksValues.network?.serviceCidr || defaultCidrServices);
      }
      if (eksValues.loadBalancer != null) {
        setIPAllowList(eksValues.loadBalancer.allowlistIpRanges);
        setWildCardDomain(eksValues.loadBalancer.wildcardDomain);
        //setAccessS3Logs(eksValues.loadBalancer.enableS3AccessLogs)

        if (eksValues.loadBalancer.tags) {
          setAwsTags(
            Object.entries(eksValues.loadBalancer.tags)
              .map(([key, value]) => `${key}=${value}`)
              .join(",")
          );
        }

        setLoadBalancerType(
          eksValues.loadBalancer.loadBalancerType?.toString() ===
          "LOAD_BALANCER_TYPE_ALB"
        );
        setwafV2ARN(eksValues.loadBalancer.wafv2Arn);
        setWaf2Enabled(eksValues.loadBalancer.enableWafv2);
      }

      if (eksValues.logging != null) {
        const l = new EKSLogging();
        l.enableApiServerLogs = eksValues.logging.enableApiServerLogs;
        l.enableAuditLogs = eksValues.logging.enableAuditLogs;
        l.enableAuthenticatorLogs = eksValues.logging.enableAuthenticatorLogs;
        l.enableControllerManagerLogs =
          eksValues.logging.enableControllerManagerLogs;
        l.enableSchedulerLogs = eksValues.logging.enableSchedulerLogs;
        setControlPlaneLogs(l);
      }
      setGuardDutyEnabled(eksValues.enableGuardDuty);
      setKmsEncryptionEnabled(eksValues.enableKmsEncryption);
    }
  }, [isExpanded, props.selectedClusterVersion]);

  useEffect(() => {
    if (!props.clusterId) {
      setStep(1)
      preflightChecks()
    }
  }, [props.selectedClusterVersion, awsRegion]);

  const requestQuotasAndProvision = async () => {
    await requestQuotaIncrease()
    await createCluster()
  }

  const requestQuotaIncrease = async () => {

    try {
      setIsLoading(true);
      console.log(quotaIncrease)
      var data = new QuotaIncreaseRequest({
        projectId: BigInt(currentProject.id),
        cloudProvider: EnumCloudProvider.AWS,
        cloudProviderCredentialsId: props.credentialId,
        preflightValues: {
          case: "eksPreflightValues",
          value: new EKSPreflightValues({
            region: awsRegion,
          })
        },
        quotaIncreases: quotaIncrease
      });
      await api.requestQuotaIncrease(
        "<token>", data,
        {
          id: currentProject.id,
        }
      )


      setIsLoading(false)
    } catch (err) {
      console.log(err)
      setIsLoading(false)
    }

  }



  const preflightChecks = async () => {

    try {
      setIsLoading(true);
      setPreflightData(null);
      setPreflightFailed(true)
      setPreflightError("");

      var data = new PreflightCheckRequest({
        projectId: BigInt(currentProject.id),
        cloudProvider: EnumCloudProvider.AWS,
        cloudProviderCredentialsId: props.credentialId,
        preflightValues: {
          case: "eksPreflightValues",
          value: new EKSPreflightValues({
            region: awsRegion,
          })
        }
      });
      const preflightDataResp = await api.preflightCheck(
        "<token>", data,
        {
          id: currentProject.id,
        }
      )
      // Check if any of the preflight checks has a message
      let hasMessage = false;
      let errors = "Preflight Checks Failed : ";
      let quotas: EnumQuotaIncrease[] = [];
      for (let check in preflightDataResp?.data?.Msg.preflight_checks) {

        if (preflightDataResp?.data?.Msg.preflight_checks[check]?.message) {
          quotas.push(PREFLIGHT_TO_ENUM[check])
          hasMessage = true;
          errors = errors + check + ", "
        }
      }
      console.log(quotas)
      setQuotaIncrease(quotas)
      // If none of the checks have a message, set setPreflightFailed to false
      if (hasMessage) {
        setShowPreflightModal(true)
        markStepStarted("provisioning-failed", errors);
      }
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
              {user?.isPorterUser && (
                <Input
                  width="350px"
                  type="string"
                  value={clusterVersion}
                  disabled={true}
                  setValue={(x: string) => setCidrRangeServices(x)}
                  label="Cluster version (only shown to porter.run emails)"
                />

              )}
              <Spacer y={1} />
              <Select
                options={machineTypeOptions}
                width="350px"
                disabled={isReadOnly}
                value={machineType}
                setValue={setMachineType}
                label="Machine type"
              />
              <Spacer y={1} />
              <Input
                width="350px"
                type="number"
                disabled={isReadOnly}
                value={maxInstances.toString()}
                setValue={(x: string) => {
                  const num = parseInt(x, 10)
                  if (num == undefined) {
                    return
                  }
                  setMaxInstances(num)
                }}
                label="Maximum number of application nodes"
                placeholder="ex: 1"
              />
              <Spacer y={1} />
              <Input
                width="350px"
                type="number"
                disabled={isReadOnly}
                value={minInstances.toString()}
                setValue={(x: string) => {
                  const num = parseInt(x, 10)
                  if (num == undefined) {
                    return
                  }
                  setMinInstances(num)
                }}
                label="Minimum number of application nodes. If set to 0, no applications will be deployed."
                placeholder="ex: 1"
              />
              <Spacer y={1} />
              <Input
                width="350px"
                type="string"
                value={cidrRangeVPC}
                disabled={props.clusterId}
                setValue={(x: string) => setCidrRangeVPC(x)}
                label="CIDR range for AWS VPC"
                placeholder="ex: 10.78.0.0/16"
              />
              <Spacer y={1} />
              <Input
                width="350px"
                type="string"
                value={cidrRangeServices}
                disabled={props.clusterId}
                setValue={(x: string) => setCidrRangeServices(x)}
                label="CIDR range for Kubernetes internal services"
                placeholder="ex: 172.20.0.0/16"
              />
              {!currentProject.simplified_view_enabled && (
                <>
                  <Spacer y={1} />
                  <Checkbox
                    checked={controlPlaneLogs.enableApiServerLogs}
                    disabled={isReadOnly}
                    toggleChecked={() => {
                      setControlPlaneLogs(
                        new EKSLogging({
                          ...controlPlaneLogs,
                          enableApiServerLogs: !controlPlaneLogs.enableApiServerLogs,
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
                          enableAuthenticatorLogs: !controlPlaneLogs.enableAuthenticatorLogs,
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
                          enableControllerManagerLogs: !controlPlaneLogs.enableControllerManagerLogs,
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
                          enableSchedulerLogs: !controlPlaneLogs.enableSchedulerLogs,
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
                    checked={loadBalancerType}
                    disabled={isReadOnly}
                    toggleChecked={() => {
                      if (loadBalancerType) {
                        setWildCardDomain("");
                        setIPAllowList("");
                        setwafV2ARN("");
                        setAwsTags("");
                        seCertificateARN("");
                        setWaf2Enabled(false);
                        //setAccessS3Logs(false);
                      }

                      setLoadBalancerType(!loadBalancerType);
                    }}
                    disabledTooltip={
                      "Wait for provisioning to complete before editing this field."
                    }
                  >
                    <Text color="helper">Set Load Balancer Type to ALB</Text>
                  </Checkbox>
                  <Spacer y={1} />
                  {loadBalancerType && (
                    <>
                      <FlexCenter>
                        <Input
                          width="350px"
                          disabled={isReadOnly}
                          value={wildCardDomain}
                          setValue={(x: string) => setWildCardDomain(x)}
                          label="Wildcard domain"
                          placeholder="user-2.porter.run"
                        />
                        <Wrapper>
                          <Tooltip
                            children={<Icon src={info} />}
                            content={
                              "The provided domain should have a wildcard subdomain pointed to the LoadBalancer address. Using testing.porter.run will create a certificate for testing.porter.run with a SAN *.testing.porter.run"
                            }
                            position="right"
                          />
                        </Wrapper>
                      </FlexCenter>

                      {validateInput(wildCardDomain) && (
                        <ErrorInLine>
                          <i className="material-icons">error</i>
                          {validateInput(wildCardDomain)}
                        </ErrorInLine>
                      )}
                      <Spacer y={1} />

                      <FlexCenter>
                        <>
                          <Input
                            width="350px"
                            disabled={isReadOnly}
                            value={IPAllowList}
                            setValue={(x: string) => setIPAllowList(x)}
                            label="IP Allow List"
                            placeholder="160.72.72.58/32,160.72.72.59/32"
                          />
                          <Wrapper>
                            <Tooltip
                              children={<Icon src={info} />}
                              content={
                                "Each range should be a CIDR, including netmask such as 10.1.2.3/21. To use multiple values, they should be comma-separated with no spaces"
                              }
                              position="right"
                            />
                          </Wrapper>
                        </>
                      </FlexCenter>
                      {validateIPInput(IPAllowList) && (
                        <ErrorInLine>
                          <i className="material-icons">error</i>
                          {"Needs to be Comma Separated Valid IP addresses"}
                        </ErrorInLine>
                      )}
                      <Spacer y={1} />

                      <Input
                        width="350px"
                        disabled={isReadOnly}
                        value={certificateARN}
                        setValue={(x: string) => seCertificateARN(x)}
                        label="Certificate ARN"
                        placeholder="arn:aws:acm:REGION:ACCOUNT_ID:certificate/ACM_ID"
                      />
                      <Spacer y={1} />

                      <FlexCenter>
                        <>
                          <Input
                            width="350px"
                            disabled={isReadOnly}
                            value={awsTags}
                            setValue={(x: string) => setAwsTags(x)}
                            label="AWS Tags"
                            placeholder="costcenter=1,environment=10,project=32"
                          />
                          <Wrapper>
                            <Tooltip
                              children={<Icon src={info} />}
                              content={
                                "Each tag should be of the format 'key=value'. To use multiple values, they should be comma-separated with no spaces."
                              }
                              position="right"
                            />
                          </Wrapper>
                        </>
                      </FlexCenter>
                      {validateTags(awsTags) && (
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
                      {/*<Spacer y={1} />*/}
                      <Checkbox
                        checked={wafV2Enabled}
                        disabled={isReadOnly}
                        toggleChecked={() => {
                          if (wafV2Enabled) {
                            setwafV2ARN("");
                          }
                          setWaf2Enabled(!wafV2Enabled);
                        }}
                        disabledTooltip={
                          "Wait for provisioning to complete before editing this field."
                        }
                      >
                        <Text color="helper">WAFv2 Enabled</Text>
                      </Checkbox>
                      {wafV2Enabled && (
                        <>
                          <Spacer y={1} />

                          <FlexCenter>
                            <>
                              <Input
                                width="500px"
                                type="string"
                                label="WAFv2 ARN"
                                disabled={isReadOnly}
                                value={wafV2ARN}
                                setValue={(x: string) => setwafV2ARN(x)}
                                placeholder="arn:aws:wafv2:REGION:ACCOUNT_ID:regional/webacl/ACL_NAME/RULE_ID"
                              />
                              <Wrapper>
                                <Tooltip
                                  children={<Icon src={info} />}
                                  content={
                                    'Only Regional WAFv2 is supported. To find your ARN, navigate to the WAF console, click the Gear icon in the top right, and toggle "ARN" to on'
                                  }
                                  position="right"
                                />
                              </Wrapper>
                            </>
                          </FlexCenter>

                          {(wafV2ARN == undefined || wafV2ARN?.length == 0) && (
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
                      checked={guardDutyEnabled}
                      disabled={isReadOnly}
                      toggleChecked={() => {
                        setGuardDutyEnabled(!guardDutyEnabled);
                      }}
                      disabledTooltip={
                        "Wait for provisioning to complete before editing this field."
                      }
                    >
                      <Text color="helper">
                        Install AWS GuardDuty agent on this cluster (see details to fully enable)
                      </Text>
                      <Spacer x={.5} inline />
                      <Tooltip
                        children={<Icon src={info} />}
                        content={
                          "In addition to installing the agent, you must enable GuardDuty through your AWS Console and enable EKS Protection in the EKS Protection tab of the GuardDuty console."
                        }
                        position="right"
                      />
                    </Checkbox>
                  </FlexCenter>
                  <Spacer y={1} />
                  <FlexCenter>
                    <Checkbox
                      checked={kmsEncryptionEnabled}
                      disabled={isReadOnly || currentCluster != null}
                      toggleChecked={() => {
                        setKmsEncryptionEnabled(!kmsEncryptionEnabled);
                      }}
                      disabledTooltip={kmsEncryptionEnabled ? "KMS encryption can never be disabled." :
                        "Encryption is only supported at cluster creation."
                      }
                    >
                      <Text color="helper">
                        Enable KMS encryption for this cluster
                      </Text>
                      <Spacer x={.5} inline />
                      <Tooltip
                        children={<Icon src={info} />}
                        content={
                          "KMS encryption can never be disabled. Deletion of the KMS key will permanently place this cluster in a degraded state."
                        }
                        position="right"
                      />
                    </Checkbox>
                  </FlexCenter>
                  {kmsEncryptionEnabled && (
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
          )
        }
      </>
    );
  };

  const dismissPreflight = () => {
    setShowHelpMessage(false);
    preflightChecks();
  }

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <VerticalSteps
          currentStep={step}
          steps={[
            <>
              <Text size={16}>Select an AWS region</Text><Spacer y={.5} /><Text color="helper">
                Porter will automatically provision your infrastructure in the
                specified region.
              </Text><Spacer height="10px" /><SelectRow
                options={regionOptions}
                width="350px"
                disabled={isReadOnly || isLoading}
                value={awsRegion}
                scrollBuffer={true}
                dropdownMaxHeight="240px"
                setActiveValue={setAwsRegion}
                label="📍 AWS region" />
              <>
                {
                  (user?.isPorterUser || currentProject?.multi_cluster) && renderAdvancedSettings()
                }
              </>
            </>,
            <>
              <PreflightChecks provider='AWS' preflightData={preflightData} error={preflightError} />
              <Spacer y={.5} />
              {(preflightFailed && preflightData) &&
                <>
                  {showHelpMessage ? <>
                    <Text color="helper">
                      Your account currently is blocked from provisioning in {awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                    </Text>
                    <Spacer y={.5} />
                    <Text color="helper">
                      Porter can automatically request quota increases for you and email you once the cluster is provisioned.
                    </Text>
                    <Spacer y={.5} />
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '15px' }}>
                      <Button
                        disabled={isLoading}
                        onClick={requestQuotasAndProvision}

                      >
                        Email me once cluster is provisioned
                      </Button>
                      <Button
                        disabled={isLoading}
                        onClick={dismissPreflight}
                        color="#313539"
                      >
                        I'll do it myself and retry checks
                      </Button>
                    </div>
                  </> : (
                    <><Text color="helper">
                      Your account currently is blocked from provisioning in {awsRegion} due to a quota limit imposed by AWS. Either change the region or request to increase quotas.
                    </Text><Spacer y={.5} /><Button
                      disabled={isLoading}
                      onClick={preflightChecks}

                    >
                        Retry checks
                      </Button></>)}
                </>
              }
              {/* {showPreflightModal && (preflightFailed && preflightData) &&
                <Modal closeModal={() => setShowPreflightModal(false)} width="800px">
                  <Text size={16}>Request quota increase on Porter</Text>
                  <Spacer y={1} />
                  <Text color="helper">
                    Your AWS account currently is blocked from provisioning in {awsRegion} due to a quota limit imposed by AWS. Would you like to request a quota increase?
                  </Text>
                  <Spacer y={1} />
                  <Text color="helper">
                    Porter will request an increase and send you an email when your cluster has been provisioned.
                  </Text>
                  <Spacer y={1} />
                  <SelectRow
                    options={regionOptions}
                    width="350px"
                    disabled={isReadOnly || isLoading}
                    value={awsRegion}
                    scrollBuffer={true}
                    dropdownMaxHeight="240px"
                    setActiveValue={setAwsRegion}
                    label="Request increase and provision in: " />
                  <Spacer y={1} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      // disabled={isDisabled() || preflightFailed || isLoading}
                      onClick={createCluster}
                      status={getStatus()}
                    >
                      Email me once cluster is provisioned.
                    </Button>

                    <Button
                      // disabled={isDisabled() || preflightFailed || isLoading}
                      onClick={createCluster}
                      status={getStatus()}
                      color="#ffffff11"
                    >
                      No thanks, I'll do it myself.
                    </Button>
                  </div>

                </Modal>
              } */}
            </>,
            <>
              <Text size={16}>Provision your cluster</Text>
              <Spacer y={1} />
              <Button
                // disabled={isDisabled()}
                // disabled={isDisabled() || preflightFailed || isLoading}
                disabled={preflightFailed || isLoading}
                onClick={createCluster}
                status={getStatus()}
              >
                Provision
              </Button>
              <Spacer y={1} /></>
          ].filter((x) => x)}
        />
      );
    }

    // If settings, update full form
    return (
      <><StyledForm>
        <Heading isAtTop>EKS configuration</Heading>
        <SelectRow
          options={regionOptions}
          width="350px"
          disabled={isReadOnly || true}
          value={awsRegion}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setAwsRegion}
          label="📍 AWS region" />
        {renderAdvancedSettings()}
      </StyledForm>
        <Button
          // disabled={isDisabled()}
          disabled={isDisabled() || isLoading}
          onClick={createCluster}
          status={getStatus()}
        >
          Provision
        </Button></>
    );
  };

  return (
    <>
      {renderForm()}
      {
        user.isPorterUser &&
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

const AWS_LOGIN_ERROR_MESSAGE =
  "Porter could not access your AWS account. Please make sure you have granted permissions and try again.";
const AWS_EIP_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of elastic IPs allowed in the region. Additional addresses must be requested in order to provision.";
const AWS_VPC_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of VPCs allowed in the region. Additional VPCs must be requested in order to provision.";
const AWS_NAT_GATEWAY_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of NAT Gateways allowed in the region. Additional NAT Gateways must be requested in order to provision.";
const AWS_VCPU_QUOTA_ERROR_MESSAGE =
  "Your AWS account has reached the limit of vCPUs allowed in the region. Additional vCPUs must be requested in order to provision.";
const DEFAULT_ERROR_MESSAGE =
  "An error occurred while provisioning your infrastructure. Please try again.";

const errorMessageToModal = (errorMessage: string) => {
  switch (errorMessage) {
    case AWS_LOGIN_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Granting Porter access to AWS
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter needs access to your AWS account in order to create
            infrastructure. You can grant Porter access to AWS by following
            these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            <Link
              to="https://aws.amazon.com/resources/create-account/"
              target="_blank"
            >
              Create an AWS account
            </Link>
            <Spacer inline width="5px" />
            if you don't already have one.
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Once you are logged in to your AWS account,
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              copy your account ID
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Fill in your account ID on Porter and select "Grant permissions".
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            After being redirected to AWS, select "Create stack" on the AWS
            console.
          </Step>
          <Spacer y={1} />
          <Step number={5}>Return to Porter and select "Continue".</Step>
        </>
      );
    case AWS_EIP_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more EIP Adresses
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more EIP addresses or delete
            existing ones in order to provision in the region specified. You can
            request more addresses by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/ec2/quotas"
              target="_blank"
            >
              the Amazon Elastic Compute Cloud (Amazon EC2) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "EC2-VPC Elastic IPs" in the search box and click on the
            search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 3 addresses above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_VPC_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more VPCs
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more VPCs or delete existing ones in
            order to provision in the region specified. You can request more
            VPCs by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/vpc/quotas"
              target="_blank"
            >
              the Amazon Virtual Private Cloud (Amazon VPC) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "VPCs per Region" in the search box and click on the
            search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 1 VPCs above your current
            quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_NAT_GATEWAY_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more NAT Gateways
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more NAT Gateways or delete existing
            ones in order to provision in the region specified. You can request
            more NAT Gateways by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/vpc/quotas"
              target="_blank"
            >
              the Amazon Virtual Private Cloud (Amazon VPC) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "NAT gateways per Availability Zone" in the search box
            and click on the search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 3 NAT Gateways above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    case AWS_VCPU_QUOTA_ERROR_MESSAGE:
      return (
        <>
          <Text size={16} weight={500}>
            Requesting more vCPUs
          </Text>
          <Spacer y={1} />
          <Text color="helper">
            You will need to either request more vCPUs or delete existing
            instances in order to provision in the region specified. You can
            request more vCPUs by following these steps:
          </Text>
          <Spacer y={1} />
          <Step number={1}>
            Log into
            <Spacer inline width="5px" />
            <Link
              to="https://console.aws.amazon.com/billing/home?region=us-east-1#/account"
              target="_blank"
            >
              your AWS account
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={2}>
            Navigate to
            <Spacer inline width="5px" />
            <Link
              to="https://us-east-1.console.aws.amazon.com/servicequotas/home/services/ec2/quotas"
              target="_blank"
            >
              the Amazon Elastic Compute Cloud (Amazon EC2) Service Quotas
              portal
            </Link>
            .
          </Step>
          <Spacer y={1} />
          <Step number={3}>
            Search for "Running On-Demand Standard (A, C, D, H, I, M, R, T, Z)
            instances" in the search box and click on the search result.
          </Step>
          <Spacer y={1} />
          <Step number={4}>
            Click on "Request quota increase". In order to provision with
            Porter, you will need to request at least 10 vCPUs above your
            current quota limit.
          </Step>
          <Spacer y={1} />
          <Step number={5}>
            Once that request is approved, return to Porter and retry the
            provision.
          </Step>
        </>
      );
    default:
      return null;
  }
};
