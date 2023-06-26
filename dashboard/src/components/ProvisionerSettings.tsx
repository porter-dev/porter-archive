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
import Helper from "components/form-components/Helper";
import InputRow from "./form-components/InputRow";
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
import { Certificate } from "crypto";
import Tooltip from "./porter/Tooltip";
import Icon from "./porter/Icon";
import { set } from "traverse";
import { load } from "js-yaml";
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
  { value: "g4dn.xlarge", label: "g4dn.xlarge" },
];

const clusterVersionOptions = [
  { value: "v1.24.0", label: "1.24.0" },
  { value: "v1.25.0", label: "1.25.0" },
];

type Props = RouteComponentProps & {
  selectedClusterVersion?: Contract;
  provisionerError?: string;
  credentialId: string;
  clusterId?: number;
};

const ProvisionerSettings: React.FC<Props> = (props) => {
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
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [machineType, setMachineType] = useState("t3.xlarge");
  const [loadBalancerType, setLoadBalancerType] = useState(false);
  const [wildCardDomain, setWildCardDomain] = useState("")
  const [IPAllowList, setIPAllowList] = useState<string>("")
  //const [accessS3Logs, setAccessS3Logs] = useState<boolean>(false)
  const [wafV2Enabled, setWaf2Enabled] = useState<boolean>(false)
  const [awsTags, setAwsTags] = useState<string>("")
  const [wafV2ARN, setwafV2ARN] = useState("")
  const [certificateARN, seCertificateARN] = useState("")
  const [isExpanded, setIsExpanded] = useState(false);
  const [minInstances, setMinInstances] = useState(1);
  const [maxInstances, setMaxInstances] = useState(10);
  const [additionalNodePolicies, setAdditionalNodePolicies] = useState<string[]>([]);
  const [cidrRange, setCidrRange] = useState("10.78.0.0/16");
  const [clusterVersion, setClusterVersion] = useState("v1.24.0");
  const [loadBalancer, setLoadBalancer] = useState<LoadBalancer | undefined>();
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>(undefined);
  const [isClicked, setIsClicked] = useState(false);
  const markStepStarted = async (step: string) => {
    try {
      await api.updateOnboardingStep("<token>", { step }, {});
    } catch (err) {
      // console.log(err);
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
          errorModalContents={errorMessageToModal(errorMessage)}
        />
      );
    }
    return undefined;
  };
  const validateInput = (wildCardDomainer) => {
    if (!wildCardDomainer) {
      return "Required for ALB Load Balancer"
    }
    if (wildCardDomainer?.charAt(0) == "*") {
      return "Wildcard domain cannot start with *"
    }
    return false;

  };
  function validateIPInput(IPAllowList) {
    // This regular expression checks for an IP address with a subnet mask.
    const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!IPAllowList) {
      return false
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
    return (!clusterName)
  }
  const userProvisioning = () => {
    //If the cluster is updating or updating unavailabe but there are no errors do not allow re-provisioning 
    return (isReadOnly && (props.provisionerError === ""))
  }

  const isDisabled = () => {

    return (
      !user?.isPorterUser &&
      (clusterNameDoesNotExist() ||
        userProvisioning() ||
        isClicked)
    );
  };
  function convertStringToTags(tagString) {
    if (typeof tagString !== 'string' || tagString.trim() === '') {
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
        loadBalancerObj.allowlistIpRanges = IPAllowList
      }
      if (wafV2Enabled) {
        loadBalancerObj.enableWafv2 = wafV2Enabled;
      }
      else {
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
            clusterVersion: clusterVersion || "v1.24.0",
            cidrRange: cidrRange || "10.78.0.0/16",
            region: awsRegion,
            loadBalancer: loadBalancerObj,
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

      if (!props.clusterId) {
        markStepStarted("pre-provisioning-check-started");

        await api.preflightCheckAWSUsage(
          "<token>",
          {
            target_arn: props.credentialId,
            region: awsRegion,
          },
          {
            id: currentProject.id,
          }
        );

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
      let eksValues: EKS = contract.cluster?.eksKind as EKS;
      if (eksValues == null) {
        return
      }
      eksValues.nodeGroups.map((nodeGroup: EKSNodeGroup) => {
        if (nodeGroup.nodeGroupType.toString() === "NODE_GROUP_TYPE_APPLICATION") {
          setMachineType(nodeGroup.instanceType);
          setMinInstances(nodeGroup.minInstances);
          setMaxInstances(nodeGroup.maxInstances);
        }

        if (nodeGroup.additionalPolicies?.length > 0) {
          // this shares policies across all node groups, but there is no reason that this can be specific policies per node group
          setAdditionalNodePolicies(nodeGroup.additionalPolicies);
        }
      });
      setCreateStatus("");
      setClusterName(eksValues.clusterName);
      setAwsRegion(eksValues.region);
      setClusterVersion(eksValues.clusterVersion);
      setCidrRange(eksValues.cidrRange);
      if (eksValues.loadBalancer != null) {
        setIPAllowList(eksValues.loadBalancer.allowlistIpRanges)
        setWildCardDomain(eksValues.loadBalancer.wildcardDomain)
        //setAccessS3Logs(eksValues.loadBalancer.enableS3AccessLogs)

        if (eksValues.loadBalancer.tags) {
          setAwsTags(Object.entries(eksValues.loadBalancer.tags)
            .map(([key, value]) => `${key}=${value}`)
            .join(','));
        }

        setLoadBalancerType(eksValues.loadBalancer.loadBalancerType?.toString() === "LOAD_BALANCER_TYPE_ALB")
        setwafV2ARN(eksValues.loadBalancer.wafv2Arn)
        setWaf2Enabled(eksValues.loadBalancer.enableWafv2)
      }
    }

  }, [isExpanded, props.selectedClusterVersion]);

  const renderForm = () => {
    // Render simplified form if initial create
    if (!props.clusterId) {
      return (
        <>
          <Text size={16}>Select an AWS region</Text>
          <Spacer y={1} />
          <Text color="helper">
            Porter will automatically provision your infrastructure in the
            specified region.
          </Text>
          <Spacer height="10px" />
          <SelectRow
            options={regionOptions}
            width="350px"
            disabled={isReadOnly}
            value={awsRegion}
            scrollBuffer={true}
            dropdownMaxHeight="240px"
            setActiveValue={setAwsRegion}
            label="📍 AWS region"
          />
        </>
      );
    }

    // If settings, update full form
    return (
      <>
        <Heading isAtTop>EKS configuration</Heading>
        <SelectRow
          options={regionOptions}
          width="350px"
          disabled={isReadOnly || true}
          value={awsRegion}
          scrollBuffer={true}
          dropdownMaxHeight="240px"
          setActiveValue={setAwsRegion}
          label="📍 AWS region"
        />

        <Heading>
          <ExpandHeader
            onClick={() => setIsExpanded(!isExpanded)}
            isExpanded={isExpanded}
          >
            <i className="material-icons">arrow_drop_down</i>
            Advanced settings
          </ExpandHeader>
        </Heading>

        {isExpanded && (
          <>
            {user?.isPorterUser && (<Select
              options={clusterVersionOptions}
              width="350px"
              disabled={isReadOnly}
              value={clusterVersion}
              setValue={setClusterVersion}
              label="Cluster version"
            />)}
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
              value={maxInstances}
              setValue={(x: number) => setMaxInstances(x)}
              label="Maximum number of application EC2 instances"
              placeholder="ex: 1"

            />
            <Spacer y={1} />
            <Input
              width="350px"
              type="string"
              disabled={true}
              value={cidrRange}
              setValue={(x: string) => setCidrRange(x)}
              label="VPC CIDR range"
              placeholder="ex: 10.78.0.0/16"
            />

            {!currentProject.simplified_view_enabled &&
              <>
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

                    setLoadBalancerType(!loadBalancerType)
                  }}
                  disabledTooltip={"Wait for provisioning to complete before editing this field."}
                >
                  <Text color="helper">Set Load Balancer Type to ALB</Text>
                </Checkbox>
                <Spacer y={1} />
                {loadBalancerType && (<>

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
                        content={'The provided domain should have a wildcard subdomain pointed to the LoadBalancer address. Using testing.porter.run will create a certificate for testing.porter.run with a SAN *.testing.porter.run'}
                        position="right"
                      />
                    </Wrapper>

                  </FlexCenter>

                  {validateInput(wildCardDomain) && <ErrorInLine>
                    <i className="material-icons">error</i>
                    {validateInput(wildCardDomain)}
                  </ErrorInLine>}
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
                          content={'Each range should be a CIDR, including netmask such as 10.1.2.3/21. To use multiple values, they should be comma-separated with no spaces'}
                          position="right"
                        />
                      </Wrapper>
                    </>
                  </FlexCenter>
                  {validateIPInput(IPAllowList) && <ErrorInLine>
                    <i className="material-icons">error</i>
                    {"Needs to be Comma Separated Valid IP addresses"}
                  </ErrorInLine>}
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
                          content={"Each tag should be of the format 'key=value'. To use multiple values, they should be comma-separated with no spaces."}
                          position="right"
                        />
                      </Wrapper>
                    </>
                  </FlexCenter>
                  {validateTags(awsTags) && <ErrorInLine>
                    <i className="material-icons">error</i>
                    {"Needs to be Comma Separated Valid Tags"}
                  </ErrorInLine>}

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
                  <Spacer y={1} />
                  <Checkbox
                    checked={wafV2Enabled}
                    disabled={isReadOnly}
                    toggleChecked={() => {
                      if (wafV2Enabled) {
                        setwafV2ARN("");
                      }
                      setWaf2Enabled(!wafV2Enabled);
                    }}
                    disabledTooltip={"Wait for provisioning to complete before editing this field."}
                  >
                    <Text color="helper">WAFv2 Enabled</Text>
                  </Checkbox>
                  {wafV2Enabled && <>
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
                            content={'Only Regional WAFv2 is supported. To find your ARN, navigate to the WAF console, click the Gear icon in the top right, and toggle "ARN" to on'}
                            position="right"
                          />
                        </Wrapper>
                      </>
                    </FlexCenter>

                    {(wafV2ARN == undefined || wafV2ARN?.length == 0) &&

                      <ErrorInLine>
                        <i className="material-icons">error</i>
                        {"Required if WafV2 is enabled"}
                      </ErrorInLine>

                    }
                  </>}
                  <Spacer y={1} />
                </>
                )}
              </>
            }
          </>
        )
        }
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

export default withRouter(ProvisionerSettings);

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

const FlexCenter = styled.div`
  display: flex;
  align-items: center  ;
  gap: 3px;
`
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
    font-size: 18px;
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