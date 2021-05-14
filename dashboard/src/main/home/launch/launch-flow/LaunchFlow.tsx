import React, { Component } from "react";
import styled from "styled-components";

import hardcodedNames from "../hardcodedNameDict";
import SourcePage from "./SourcePage";

import {
  PorterTemplate,
  ActionConfigType,
  ChoiceType,
  ClusterType,
  StorageType,
} from "shared/types";

type PropsType = {
  currentTab?: string;
  currentTemplate: PorterTemplate;
  hideLaunchFlow: () => void;
};

type StateType = {
  currentPage: string;
  templateName: string;

  imageUrl: string;
  imageTag: string;

  actionConfig: ActionConfigType;
  procfileProcess: string;
  branch: string;
  repoType: string;
  dockerfilePath: string | null;
  procfilePath: string | null;
  folderPath: string | null;
  selectedRegistry: any;

  valuesToOverride: any;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  branch: "",
  git_repo_id: 0,
};

export default class LaunchFlow extends Component<PropsType, StateType> {
  state = {
    currentPage: "source",
    templateName: "",
    imageUrl: "",
    imageTag: "",

    actionConfig: { ...defaultActionConfig },
    procfileProcess: "",
    branch: "",
    repoType: "",
    dockerfilePath: null as string | null,
    procfilePath: null as string | null,
    folderPath: null as string | null,
    selectedRegistry: null as any,

    valuesToOverride: {} as any,
  };

  renderCurrentPage = () => {
    let { currentTemplate } = this.props;
    let { 
      currentPage, 
      templateName,
      imageUrl,
      imageTag,
      actionConfig,
      branch,
      repoType,
      dockerfilePath,
      procfileProcess,
      procfilePath,
      folderPath,
      selectedRegistry
    } = this.state;

    if (currentPage === "source") {
      return (
        <SourcePage
          templateName={templateName}
          setTemplateName={(x: string) => this.setState({ templateName: x })}
          setValuesToOverride={(x: any) => 
            this.setState({ valuesToOverride: x })
          }

          imageUrl={imageUrl}
          setImageUrl={(x: string) => this.setState({ imageUrl: x })}
          imageTag={imageTag}
          setImageTag={(x: string) => this.setState({ imageTag: x })}

          actionConfig={actionConfig}
          setActionConfig={(x: ActionConfigType) => 
            this.setState({ actionConfig: x })
          }
          branch={branch}
          setBranch={(x: string) => this.setState({ branch: x })}
          procfileProcess={procfileProcess}
          setProcfileProcess={(x: string) => 
            this.setState({ procfileProcess: x })
          }
          repoType={repoType}
          setRepoType={(x: string) => this.setState({ repoType: x })}
          dockerfilePath={dockerfilePath}
          setDockerfilePath={(x: string) => 
            this.setState({ dockerfilePath: x })
          }
          folderPath={folderPath}
          setFolderPath={(x: string) => this.setState({ folderPath: x })}
          procfilePath={procfilePath}
          setProcfilePath={(x: string) => this.setState({ procfilePath: x })}
          selectedRegistry={selectedRegistry}
          setSelectedRegistry={(x: string) => 
            this.setState({ selectedRegistry: x })
          }
        />
      );
    }
  }

  renderIcon = () => {
    let icon = this.props.currentTemplate?.icon;
    if (icon) {
      return <Icon src={icon} />;
    }

    return (
      <Polymer>
        <i className="material-icons">layers</i>
      </Polymer>
    );
  };

  render() {
    let { currentTab } = this.props;
    let { name } = this.props.currentTemplate;
    if (hardcodedNames[name]) {
      name = hardcodedNames[name];
    }

    return (
      <StyledLaunchFlow>
        <TitleSection>
          <i
            className="material-icons"
            onClick={this.props.hideLaunchFlow}
          >
            keyboard_backspace
          </i>
          {this.renderIcon()}
          <Title>New {name} {currentTab === "porter" ? null : "Instance"}</Title>
        </TitleSection>
        {this.renderCurrentPage()}
      </StyledLaunchFlow>
    );
  }
}

const Icon = styled.img`
  width: 40px;
  margin-right: 14px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Polymer = styled.div`
  margin-bottom: -3px;

  > i {
    color: ${(props) => props.theme.containerIcon};
    font-size: 24px;
    margin-left: 12px;
    margin-right: 3px;
  }
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    margin-right: 10px;
    padding: 3px;
    margin-left: 0px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858faaaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const StyledLaunchFlow = styled.div`
  width: calc(90% - 130px);
  min-width: 300px;
  position: relative;
  padding-top: 50px;
  margin-top: calc(50vh - 340px);
  opacity: 0;
  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0px);
    }
  }
`;
