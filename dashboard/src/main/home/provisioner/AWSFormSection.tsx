import React, { Component, useContext, useEffect, useState } from "react";
import styled from "styled-components";

import close from "assets/close.png";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";
import { pushFiltered } from "shared/routing";

import SelectRow from "components/form-components/SelectRow";
import InputRow from "components/form-components/InputRow";
import CheckboxRow from "components/form-components/CheckboxRow";
import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import SaveButton from "components/SaveButton";
import CheckboxList from "components/form-components/CheckboxList";
import { useHistory, useLocation } from "react-router";

type PropsType = {
  setSelectedProvisioner: (x: string | null) => void;
  handleError: () => void;
  projectName: string;
  infras: InfraType[];
  highlightCosts?: boolean;
  trackOnSave: () => void;
};

const provisionOptions = [
  { value: "ecr", label: "Elastic Container Registry (ECR)" },
  { value: "eks", label: "Elastic Kubernetes Service (EKS)" },
];

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
  { value: "t2.medium", label: "t2.medium" },
  { value: "t2.xlarge", label: "t2.xlarge" },
  { value: "t2.2xlarge", label: "t2.2xlarge" },
  { value: "t3.medium", label: "t3.medium" },
  { value: "t3.xlarge", label: "t3.xlarge" },
  { value: "t3.2xlarge", label: "t3.2xlarge" },
];

const costMapping: Record<string, number> = {
  "t2.medium": 35,
  "t2.xlarge": 135,
  "t2.2xlarge": 270,
  "t3.medium": 30,
  "t3.xlarge": 120,
  "t3.2xlarge": 240,
};

const AWSFormSectionFC: React.FC<PropsType> = (props) => {
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsMachineType, setAwsMachineType] = useState("t2.medium");
  const [awsAccessId, setAwsAccessId] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [clusterNameSet, setClusterNameSet] = useState(false);
  const [selectedInfras, setSelectedInfras] = useState([...provisionOptions]);
  const [buttonStatus, setButtonStatus] = useState("");
  const [provisionConfirmed, setProvisionConfirmed] = useState(false);
  // This is added only for tracking purposes
  // With this prop we will track down if the user has had an intent of filling the formulary
  const [isFormDirty, setIsFormDirty] = useState(false);

  const context = useContext(Context);

  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    if (!isFormDirty) {
      return;
    }

    window.analytics?.track("provision_form-dirty", {
      provider: "aws",
    });
  }, [isFormDirty]);

  useEffect(() => {
    if (props.infras) {
      // From the dashboard, only uncheck and disable if "creating" or "created"
      let filtered = selectedInfras;
      props.infras.forEach((infra: InfraType, i: number) => {
        let { kind, status } = infra;
        if (status === "creating" || status === "created") {
          filtered = filtered.filter((item: any) => {
            return item.value !== kind;
          });
        }
      });
      setSelectedInfras(filtered);
    }
  }, [props.infras]);

  useEffect(() => {
    setClusterNameIfNotSet();
  }, [props.projectName]);

  const setClusterNameIfNotSet = () => {
    let projectName = props.projectName || context.currentProject?.name;

    if (!clusterNameSet && !clusterName.includes(`${projectName}-cluster`)) {
      setClusterName(
        `${projectName}-cluster-${Math.random().toString(36).substring(2, 8)}`
      );
    }
  };

  const checkFormDisabled = () => {
    if (!provisionConfirmed) {
      return true;
    }

    const { projectName } = props;
    if (projectName || projectName === "") {
      return (
        !isAlphanumeric(projectName) ||
        !(
          awsAccessId !== "" &&
          awsSecretKey !== "" &&
          awsRegion !== "" &&
          clusterName !== ""
        ) ||
        selectedInfras.length === 0
      );
    } else {
      return (
        !(
          awsAccessId !== "" &&
          awsSecretKey !== "" &&
          awsRegion !== "" &&
          clusterName !== ""
        ) || selectedInfras.length === 0
      );
    }
  };

  const catchError = (err: any) => {
    console.log(err);
    props.handleError();
  };

  // Step 1: Create a project
  // TODO: promisify this function
  const createProject = async () => {
    const { projectName } = props;
    const { user, setProjects, setCurrentProject } = context;
    try {
      const project = await api
        .createProject("<token>", { name: projectName }, {})
        .then((res) => res.data);

      // Need to set project list for dropdown
      // TODO: consolidate into ProjectSection (case on exists in list on set)
      const projectList = await api
        .getProjects(
          "<token>",
          {},
          {
            id: user.userId,
          }
        )
        .then((res) => res.data);
      setProjects(projectList);
      setCurrentProject(project);
    } catch (error) {
      catchError(error);
    }
  };

  const getAwsIntegrationId = async () => {
    const { currentProject } = context;
    try {
      const res = await api.createAWSIntegration(
        "<token>",
        {
          aws_region: awsRegion,
          aws_access_key_id: awsAccessId,
          aws_secret_access_key: awsSecretKey,
          aws_cluster_id: clusterName,
        },
        { id: currentProject.id }
      );
      return res.data;
    } catch (error) {
      catchError(error);
    }
  };

  const provisionECR = async (awsIntegrationId: string) => {
    console.log("Started provision ECR");
    const { currentProject } = context;
    try {
      await api.provisionECR(
        "<token>",
        {
          aws_integration_id: awsIntegrationId,
          ecr_name: `${currentProject.name}-registry`,
        },
        { id: currentProject.id }
      );
    } catch (error) {
      catchError(error);
    }
  };

  const provisionEKS = async (awsIntegrationId: string) => {
    const { currentProject } = context;
    try {
      await api.provisionEKS(
        "<token>",
        {
          aws_integration_id: awsIntegrationId,
          eks_name: clusterName,
          machine_type: awsMachineType,
        },
        { id: currentProject.id }
      );
    } catch (error) {
      catchError(error);
    }
  };

  // TODO: handle generically (with > 2 steps)
  const onCreateAWS = async () => {
    // Track to segment the intent of provision cluster
    props?.trackOnSave();
    setButtonStatus("loading");
    const { projectName } = props;

    if (projectName) {
      await createProject();
    }

    const awsIntegrationId = await getAwsIntegrationId();

    const filterNonAWSInfras = (infra: any) =>
      ["ecr", "eks"].includes(infra.value);

    const infraCreationRequests = selectedInfras
      // Check that we don't include any other key into the infra creation than ecr and eks
      .filter(filterNonAWSInfras)
      .map((infra) => {
        if (infra.value === "ecr") {
          return provisionECR(awsIntegrationId);
        }
        return provisionEKS(awsIntegrationId);
      });
    // Wait for all promises to be completed (could be just one)
    await Promise.all(infraCreationRequests);

    pushFiltered({ history, location }, "/dashboard", ["project_id"], {
      tab: "provisioner",
    });
  };

  const getButtonStatus = () => {
    if (props.projectName) {
      if (!isAlphanumeric(props.projectName)) {
        return "Project name contains illegal characters";
      }
    }
    if (
      !awsAccessId ||
      !awsSecretKey ||
      !provisionConfirmed ||
      !clusterName ||
      props.projectName === ""
    ) {
      return "Required fields missing";
    }
    return buttonStatus;
  };

  const renderClusterNameSection = () => {
    if (
      selectedInfras.length == 2 ||
      (selectedInfras.length == 1 && selectedInfras[0].value === "eks")
    ) {
      return (
        <InputRow
          type="text"
          value={clusterName}
          setValue={(x: string) => {
            setClusterName(x);
            setClusterNameSet(true);
          }}
          label="Cluster Name"
          placeholder="ex: porter-cluster"
          width="100%"
          isRequired={true}
        />
      );
    }
  };

  const goToGuide = () => {
    window?.analytics?.track("provision_go-to-guide", {
      hosting: "aws",
    });

    window.open(
      "https://docs.getporter.dev/docs/getting-started-with-porter-on-aws"
    );
  };

  return (
    <StyledAWSFormSection>
      <FormSection>
        <CloseButton onClick={() => props.setSelectedProvisioner(null)}>
          <CloseButtonImg src={close} />
        </CloseButton>
        <Heading isAtTop={true}>
          AWS Credentials
          <GuideButton onClick={() => goToGuide()}>
            <i className="material-icons-outlined">help</i>
            Guide
          </GuideButton>
        </Heading>
        <SelectRow
          options={regionOptions}
          width="100%"
          value={awsRegion}
          dropdownMaxHeight="240px"
          setActiveValue={(x: string) => {
            setIsFormDirty(true);
            setAwsRegion(x);
          }}
          label="📍 AWS Region"
        />
        <SelectRow
          options={machineTypeOptions}
          width="100%"
          value={awsMachineType}
          dropdownMaxHeight="240px"
          setActiveValue={(x: string) => {
            setIsFormDirty(true);
            setAwsMachineType(x);
          }}
          label="⚙️ AWS Machine Type"
        />
        {/*
        <Helper>
          Estimated Cost:{" "}
          <CostHighlight highlight={this.props.highlightCosts}>
            {`\$${
              70 + 3 * costMapping[this.state.awsMachineType] + 30
            }/Month`}
          </CostHighlight>
          <Tooltip
            title={
              <div
                style={{
                  fontFamily: "Work Sans, sans-serif",
                  fontSize: "12px",
                  fontWeight: "normal",
                  padding: "5px 6px",
                }}
              >
                EKS cost: ~$70/month <br />
                Machine (x3) cost: ~$
                {`${3 * costMapping[this.state.awsMachineType]}`}/month <br />
                Networking cost: ~$30/month
              </div>
            }
            placement="top"
          >
            <StyledInfoTooltip>
              <i className="material-icons">help_outline</i>
            </StyledInfoTooltip>
          </Tooltip>
        </Helper>
        */}
        <InputRow
          type="text"
          value={awsAccessId}
          setValue={(x: string) => {
            setIsFormDirty(true);
            setAwsAccessId(x);
          }}
          label="👤 AWS Access ID"
          placeholder="ex: AKIAIOSFODNN7EXAMPLE"
          width="100%"
          isRequired={true}
        />
        <InputRow
          type="password"
          value={awsSecretKey}
          setValue={(x: string) => {
            setIsFormDirty(true);
            setAwsSecretKey(x);
          }}
          label="🔒 AWS Secret Key"
          placeholder="○ ○ ○ ○ ○ ○ ○ ○ ○"
          width="100%"
          isRequired={true}
        />
        <Br />
        <Heading>AWS Resources</Heading>
        <Helper>
          Porter will provision the following AWS resources in your own cloud.
        </Helper>
        <CheckboxList
          options={provisionOptions}
          selected={selectedInfras}
          setSelected={(x: { value: string; label: string }[]) => {
            setIsFormDirty(true);
            setSelectedInfras(x);
          }}
        />
        {renderClusterNameSection()}
        <Helper>
          By default, Porter creates a cluster with three t2.medium instances
          (2vCPUs and 4GB RAM each). AWS will bill you for any provisioned
          resources. Learn more about EKS pricing
          <Highlight href="https://aws.amazon.com/eks/pricing/" target="_blank">
            here
          </Highlight>
          .
        </Helper>
        <CheckboxRow
          isRequired={true}
          checked={provisionConfirmed}
          toggle={() => {
            setIsFormDirty(true);
            setProvisionConfirmed(!provisionConfirmed);
          }}
          label="I understand and wish to proceed"
        />
      </FormSection>
      {props.children ? props.children : <Padding />}
      <SaveButton
        text="Submit"
        disabled={checkFormDisabled() || buttonStatus === "loading"}
        onClick={onCreateAWS}
        makeFlush={true}
        status={getButtonStatus()}
        helper="Note: Provisioning can take up to 15 minutes"
      />
    </StyledAWSFormSection>
  );
};

export default AWSFormSectionFC;

const Highlight = styled.a`
  color: #8590ff;
  cursor: pointer;
  text-decoration: none;
  margin-left: 5px;
`;

const Padding = styled.div`
  height: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 2px;
`;

const StyledAWSFormSection = styled.div`
  position: relative;
  padding-bottom: 35px;
`;

const FormSection = styled.div`
  background: #ffffff11;
  margin-top: 25px;
  background: #26282f;
  border-radius: 5px;
  margin-bottom: 25px;
  padding: 25px;
  padding-bottom: 16px;
  font-size: 13px;
  animation: fadeIn 0.3s 0s;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const GuideButton = styled.div`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 8px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    color: #ffffff;
    border: 1px solid #ffffff;

    > i {
      color: #ffffff;
    }
  }

  > i {
    color: #aaaabb;
    font-size: 16px;
    margin-right: 7px;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const CostHighlight = styled.span<{ highlight: boolean }>`
  background-color: ${(props) => props.highlight && "yellow"};
`;

const StyledInfoTooltip = styled.div`
  display: inline-block;
  position: relative;
  margin-right: 2px;
  > i {
    display: flex;
    align-items: center;
    position: absolute;
    top: -10px;
    font-size: 10px;
    color: #858faaaa;
    cursor: pointer;
    :hover {
      color: #aaaabb;
    }
  }
`;
