import React, { Component } from "react";
import styled from "styled-components";

import close from "assets/close.png";
import { isAlphanumeric } from "shared/common";
import api from "shared/api";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";

import SelectRow from "components/values-form/SelectRow";
import InputRow from "components/values-form/InputRow";
import CheckboxRow from "components/values-form/CheckboxRow";
import Helper from "components/values-form/Helper";
import Heading from "components/values-form/Heading";
import SaveButton from "components/SaveButton";
import CheckboxList from "components/values-form/CheckboxList";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  setSelectedProvisioner: (x: string | null) => void;
  handleError: () => void;
  projectName: string;
  infras: InfraType[];
};

type StateType = {
  awsRegion: string;
  awsAccessId: string;
  awsSecretKey: string;
  selectedInfras: { value: string; label: string }[];
  buttonStatus: string;
  provisionConfirmed: boolean;
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

// TODO: Consolidate across forms w/ HOC
class AWSFormSection extends Component<PropsType, StateType> {
  state = {
    awsRegion: "us-east-1",
    awsAccessId: "",
    awsSecretKey: "",
    selectedInfras: [...provisionOptions],
    buttonStatus: "",
    provisionConfirmed: false,
  };

  componentDidMount = () => {
    let { infras } = this.props;
    let { selectedInfras } = this.state;

    if (infras) {
      // From the dashboard, only uncheck and disable if "creating" or "created"
      let filtered = selectedInfras;
      infras.forEach((infra: InfraType, i: number) => {
        let { kind, status } = infra;
        if (status === "creating" || status === "created") {
          filtered = filtered.filter((item: any) => {
            return item.value !== kind;
          });
        }
      });
      this.setState({ selectedInfras: filtered });
    }
  };

  checkFormDisabled = () => {
    if (!this.state.provisionConfirmed) {
      return true;
    }

    let { awsRegion, awsAccessId, awsSecretKey, selectedInfras } = this.state;
    let { projectName } = this.props;
    if (projectName || projectName === "") {
      return (
        !isAlphanumeric(projectName) ||
        !(awsAccessId !== "" && awsSecretKey !== "" && awsRegion !== "") ||
        selectedInfras.length === 0
      );
    } else {
      return (
        !(awsAccessId !== "" && awsSecretKey !== "" && awsRegion !== "") ||
        selectedInfras.length === 0
      );
    }
  };

  catchError = (err: any) => {
    console.log(err);
    this.props.handleError();
  };

  // Step 1: Create a project
  // TODO: promisify this function
  createProject = (callback?: any) => {
    console.log("Creating project");
    let { projectName, handleError } = this.props;
    let { user, setProjects, setCurrentProject, currentProject } = this.context;

    api
      .createProject("<token>", { name: projectName }, {})
      .then((res) => {
        let proj = res.data;
        // Need to set project list for dropdown
        // TODO: consolidate into ProjectSection (case on exists in list on set)
        api
          .getProjects(
            "<token>",
            {},
            {
              id: user.userId,
            }
          )
          .then((res) => {
            setProjects(res.data);
            setCurrentProject(proj, () => {
              callback && callback();
            });
          })
          .catch(this.catchError);
      })
      .catch(this.catchError);
  };

  provisionECR = () => {
    console.log("Provisioning ECR");
    let { awsAccessId, awsSecretKey, awsRegion } = this.state;
    let { currentProject } = this.context;

    return api
      .createAWSIntegration(
        "<token>",
        {
          aws_region: awsRegion,
          aws_access_key_id: awsAccessId,
          aws_secret_access_key: awsSecretKey,
        },
        { id: currentProject.id }
      )
      .then((res) =>
        api.provisionECR(
          "<token>",
          {
            aws_integration_id: res.data.id,
            ecr_name: `${currentProject.name}-registry`,
          },
          { id: currentProject.id }
        )
      )
      .catch(this.catchError);
  };

  provisionEKS = () => {
    console.log("Provisioning EKS");
    let { awsAccessId, awsSecretKey, awsRegion } = this.state;
    let { currentProject } = this.context;

    let clusterName = `${currentProject.name}-cluster`;
    api
      .createAWSIntegration(
        "<token>",
        {
          aws_region: awsRegion,
          aws_access_key_id: awsAccessId,
          aws_secret_access_key: awsSecretKey,
          aws_cluster_id: clusterName,
        },
        { id: currentProject.id }
      )
      .then((res) =>
        api.provisionEKS(
          "<token>",
          {
            aws_integration_id: res.data.id,
            eks_name: clusterName,
          },
          { id: currentProject.id }
        )
      )
      .then(() => this.props.history.push("dashboard?tab=provisioner"))
      .catch(this.catchError);
  };

  // TODO: handle generically (with > 2 steps)
  onCreateAWS = () => {
    this.setState({ buttonStatus: "loading" });
    let { projectName } = this.props;
    let { selectedInfras } = this.state;

    if (!projectName) {
      if (selectedInfras.length === 2) {
        // Case: project exists, provision ECR + EKS
        this.provisionECR().then(this.provisionEKS);
      } else if (selectedInfras[0].value === "ecr") {
        // Case: project exists, only provision ECR
        this.provisionECR().then(() =>
          this.props.history.push("dashboard?tab=provisioner")
        );
      } else {
        // Case: project exists, only provision EKS
        this.provisionEKS();
      }
    } else {
      if (selectedInfras.length === 2) {
        // Case: project DNE, provision ECR + EKS
        this.createProject(() => this.provisionECR().then(this.provisionEKS));
      } else if (selectedInfras[0].value === "ecr") {
        // Case: project DNE, only provision ECR
        this.createProject(() =>
          this.provisionECR().then(() => {
            this.props.history.push("dashboard?tab=provisioner");
          })
        );
      } else {
        // Case: project DNE, only provision EKS
        this.createProject(this.provisionEKS);
      }
    }
  };

  getButtonStatus = () => {
    if (this.props.projectName) {
      if (!isAlphanumeric(this.props.projectName)) {
        return "Project name contains illegal characters";
      }
    }
    if (
      !this.state.awsAccessId ||
      !this.state.awsSecretKey ||
      !this.state.provisionConfirmed ||
      this.props.projectName === ""
    ) {
      return "Required fields missing";
    }
    return this.state.buttonStatus;
  };

  render() {
    let { setSelectedProvisioner } = this.props;
    let { awsRegion, awsAccessId, awsSecretKey, selectedInfras } = this.state;

    return (
      <StyledAWSFormSection>
        <FormSection>
          <CloseButton onClick={() => setSelectedProvisioner(null)}>
            <CloseButtonImg src={close} />
          </CloseButton>
          <Heading isAtTop={true}>
            AWS Credentials
            <GuideButton
              href="https://docs.getporter.dev/docs/getting-started-with-porter-on-aws"
              target="_blank"
            >
              <i className="material-icons-outlined">help</i>
              Guide
            </GuideButton>
          </Heading>
          <SelectRow
            options={regionOptions}
            width="100%"
            value={awsRegion}
            dropdownMaxHeight="240px"
            setActiveValue={(x: string) => this.setState({ awsRegion: x })}
            label="📍 AWS Region"
          />
          <InputRow
            type="text"
            value={awsAccessId}
            setValue={(x: string) => this.setState({ awsAccessId: x })}
            label="👤 AWS Access ID"
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            width="100%"
            isRequired={true}
          />
          <InputRow
            type="password"
            value={awsSecretKey}
            setValue={(x: string) => this.setState({ awsSecretKey: x })}
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
              this.setState({ selectedInfras: x });
            }}
          />
          <Helper>
            By default, Porter creates a cluster with three t2.medium instances
            (2vCPUs and 4GB RAM each). AWS will bill you for any provisioned
            resources. Learn more about EKS pricing
            <Highlight
              href="https://aws.amazon.com/eks/pricing/"
              target="_blank"
            >
              here
            </Highlight>
            .
          </Helper>
          <CheckboxRow
            required={true}
            checked={this.state.provisionConfirmed}
            toggle={() =>
              this.setState({
                provisionConfirmed: !this.state.provisionConfirmed,
              })
            }
            label="I understand and wish to proceed"
          />
        </FormSection>
        {this.props.children ? this.props.children : <Padding />}
        <SaveButton
          text="Submit"
          disabled={
            this.checkFormDisabled() || this.state.buttonStatus === "loading"
          }
          onClick={this.onCreateAWS}
          makeFlush={true}
          status={this.getButtonStatus()}
          helper="Note: Provisioning can take up to 15 minutes"
        />
      </StyledAWSFormSection>
    );
  }
}

AWSFormSection.contextType = Context;

export default withRouter(AWSFormSection);

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

const GuideButton = styled.a`
  display: flex;
  align-items: center;
  margin-left: 20px;
  color: #aaaabb;
  font-size: 13px;
  margin-bottom: -1px;
  border: 1px solid #aaaabb;
  padding: 5px 10px;
  padding-left: 6px;
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
    margin-right: 6px;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;
