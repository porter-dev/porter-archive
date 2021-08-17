import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { InfraType } from "shared/types";

import Helper from "components/form-components/Helper";
import AWSFormSection from "./AWSFormSection";
import GCPFormSection from "./GCPFormSection";
import DOFormSection from "./DOFormSection";
import SaveButton from "components/SaveButton";
import ExistingClusterSection from "./ExistingClusterSection";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";
import InfoTooltip from "../../../components/InfoTooltip";

type PropsType = RouteComponentProps & {
  isInNewProject?: boolean;
  projectName?: string;
  infras?: InfraType[];
  provisioner?: boolean;
};

type StateType = {
  selectedProvider: string | null;
  highlightCosts: boolean;
  infras: InfraType[];
};

const providers = ["aws", "gcp", "do"];

class NewProject extends Component<PropsType, StateType> {
  state = {
    selectedProvider: null as string | null,
    highlightCosts: true,
    infras: [] as InfraType[],
  };

  // Handle any submission (pre-status) error
  handleError = () => {
    let { setCurrentError } = this.context;
    this.setState({ selectedProvider: null });
    setCurrentError(
      "Provisioning failed. Check your credentials and try again."
    );
    pushFiltered(this.props, "/dashboard", ["project_id"], { tab: "overview" });
  };

  renderSelectedProvider = (override?: string) => {
    let { selectedProvider } = this.state;
    let { projectName, infras } = this.props;

    if (override) {
      selectedProvider = override;
    }

    let renderSkipHelper = () => {
      if (!this.props.provisioner) {
        return;
      }

      return (
        <>
          {selectedProvider === "skipped" ? (
            <Helper>
              Don't have a Kubernetes cluster?
              <Highlight
                onClick={() => this.setState({ selectedProvider: null })}
              >
                Provision through Porter
              </Highlight>
            </Helper>
          ) : (
            <PositionWrapper selectedProvider={selectedProvider}>
              <Helper>
                Already have a Kubernetes cluster?
                <Highlight
                  onClick={() =>
                    this.setState({
                      selectedProvider: "skipped",
                    })
                  }
                >
                  Skip
                </Highlight>
              </Helper>
            </PositionWrapper>
          )}
        </>
      );
    };

    switch (selectedProvider) {
      case "aws":
        return (
          <AWSFormSection
            handleError={this.handleError}
            projectName={projectName}
            infras={infras}
            highlightCosts={this.state.highlightCosts}
            setSelectedProvisioner={(x: string | null) => {
              this.setState({ selectedProvider: x });
            }}
          >
            {renderSkipHelper()}
          </AWSFormSection>
        );
      case "gcp":
        return (
          <GCPFormSection
            handleError={this.handleError}
            projectName={projectName}
            infras={infras}
            highlightCosts={this.state.highlightCosts}
            setSelectedProvisioner={(x: string | null) => {
              this.setState({ selectedProvider: x });
            }}
          >
            {renderSkipHelper()}
          </GCPFormSection>
        );
      case "do":
        return (
          <DOFormSection
            handleError={this.handleError}
            projectName={projectName}
            infras={infras}
            highlightCosts={this.state.highlightCosts}
            setSelectedProvisioner={(x: string | null) => {
              this.setState({ selectedProvider: x });
            }}
          />
        );
      default:
        return (
          <ExistingClusterSection projectName={projectName}>
            {renderSkipHelper()}
          </ExistingClusterSection>
        );
    }
  };

  renderFooter = () => {
    let { selectedProvider } = this.state;
    let { isInNewProject } = this.props;
    let { provisioner } = this.props;
    let helper = provisioner
      ? "Note: Provisioning can take up to 15 minutes"
      : "";

    if (isInNewProject && !selectedProvider) {
      return (
        <>
          <Helper>
            Already have a Kubernetes cluster?
            <Highlight
              onClick={() => this.setState({ selectedProvider: "skipped" })}
            >
              Skip
            </Highlight>
          </Helper>
          <Br />
          <SaveButton
            text="Submit"
            disabled={true}
            onClick={() => {}}
            makeFlush={true}
            helper={helper}
          />
        </>
      );
    }
  };

  componentDidMount() {
    let { provisioner } = this.props;

    if (!provisioner) {
      this.setState({ selectedProvider: "skipped" });
    }
  }

  componentDidUpdate(prevProps: PropsType) {
    if (prevProps.provisioner !== this.props.provisioner) {
      if (!this.props.provisioner) {
        this.setState({ selectedProvider: "skipped" });
      }
    }
  }

  renderHelperText = () => {
    let { isInNewProject, provisioner } = this.props;
    if (!provisioner) {
      return;
    }

    if (isInNewProject) {
      return (
        <>
          Select your hosting backend:<Required>*</Required>
        </>
      );
    } else {
      return "Need a cluster? Provision through Porter:";
    }
  };

  render() {
    let { selectedProvider } = this.state;

    return (
      <StyledProvisionerSettings>
        <Helper>{this.renderHelperText()}</Helper>
        {!selectedProvider ? (
          <BlockList>
            {providers.map((provider: string, i: number) => {
              let providerInfo = integrationList[provider];
              return (
                <Block
                  key={i}
                  onClick={() => {
                    this.setState({
                      selectedProvider: provider,
                      highlightCosts: false,
                    });
                  }}
                >
                  <Icon src={providerInfo.icon} />
                  <BlockTitle>{providerInfo.label}</BlockTitle>
                  <CostSection
                    onClick={(e) => {
                      e.stopPropagation();
                      this.setState({
                        selectedProvider: provider,
                        highlightCosts: true,
                      });
                    }}
                  >
                    {provider == "aws" && "$200/Month"}
                    {provider == "gcp" && "$200/Month"}
                    {provider == "do" && "$100/Month"}
                    <InfoTooltip text={"aa"} />
                  </CostSection>
                  <BlockDescription>Hosted in your own cloud.</BlockDescription>
                </Block>
              );
            })}
          </BlockList>
        ) : (
          <>{this.renderSelectedProvider()}</>
        )}
        {this.renderFooter()}
      </StyledProvisionerSettings>
    );
  }
}

NewProject.contextType = Context;

export default withRouter(NewProject);

const Br = styled.div`
  width: 100%;
  height: 35px;
`;

const StyledProvisionerSettings = styled.div`
  position: relative;
`;

const PositionWrapper = styled.div<{ selectedProvider: string | null }>``;

const Highlight = styled.div`
  margin-left: 5px;
  color: #8590ff;
  display: inline-block;
  cursor: pointer;
`;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 25px;
  margin-bottom: 27px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Icon = styled.img<{ bw?: boolean }>`
  height: 42px;
  margin-top: 30px;
  margin-bottom: 15px;
  filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
`;

const BlockDescription = styled.div`
  margin-bottom: 12px;
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  font-size: 13px;
  padding: 0px 25px;
  height: 2.4em;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const BlockTitle = styled.div`
  margin-bottom: 12px;
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Block = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  border-radius: 5px;
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: ${(props) => (props.disabled ? "" : "pointer")};
  color: #ffffff;
  position: relative;
  background: #26282f;
  box-shadow: 0 3px 5px 0px #00000022;
  :hover {
    background: ${(props) => (props.disabled ? "" : "#ffffff11")};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const CostSection = styled.p`
  position: absolute;
  left: 0;
`;
