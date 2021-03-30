import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { InfraType } from "shared/types";

import Helper from "components/values-form/Helper";
import AWSFormSection from "./AWSFormSection";
import GCPFormSection from "./GCPFormSection";
import DOFormSection from "./DOFormSection";
import SaveButton from "components/SaveButton";
import ExistingClusterSection from "./ExistingClusterSection";
import { RouteComponentProps, withRouter } from "react-router";

type PropsType = RouteComponentProps & {
  isInNewProject?: boolean;
  projectName?: string;
  infras?: InfraType[];
};

type StateType = {
  selectedProvider: string | null;
  infras: InfraType[];
};

const providers = ["aws", "gcp", "do"];

class NewProject extends Component<PropsType, StateType> {
  state = {
    selectedProvider: null as string | null,
    infras: [] as InfraType[],
  };

  // Handle any submission (pre-status) error
  handleError = () => {
    let { setCurrentError } = this.context;
    this.setState({ selectedProvider: null });
    setCurrentError(
      "Provisioning failed. Check your credentials and try again."
    );
    this.props.history.push("dashboard?tab=overview");
  };

  renderSelectedProvider = () => {
    let { selectedProvider } = this.state;
    let { projectName, infras } = this.props;

    let renderSkipHelper = () => {
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

  render() {
    let { selectedProvider } = this.state;
    let { isInNewProject } = this.props;
    return (
      <StyledProvisionerSettings>
        <Helper>
          {isInNewProject ? (
            <>
              Select your hosting backend:<Required>*</Required>
            </>
          ) : (
            "Need a cluster? Provision through Porter:"
          )}
        </Helper>
        {!selectedProvider ? (
          <BlockList>
            {providers.map((provider: string, i: number) => {
              let providerInfo = integrationList[provider];
              return (
                <Block
                  key={i}
                  onClick={() => {
                    this.setState({ selectedProvider: provider });
                  }}
                >
                  <Icon src={providerInfo.icon} />
                  <BlockTitle>{providerInfo.label}</BlockTitle>
                  <BlockDescription>Hosted in your own cloud.</BlockDescription>
                </Block>
              );
            })}
          </BlockList>
        ) : (
          <>{this.renderSelectedProvider()}</>
        )}
        {isInNewProject && !selectedProvider && (
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
              helper="Note: Provisioning can take up to 15 minutes"
            />
          </>
        )}
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
