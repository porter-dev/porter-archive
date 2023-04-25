import AnimateHeight from "react-animate-height";
import React, { Component } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AdvancedBuildSettings from "./AdvancedBuildSettings";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";
import ActionConfEditorStack from "components/repo-selector/ActionConfEditorStack";
import { ActionConfigType } from "shared/types";
import { RouteComponentProps } from "react-router";
import { Context } from "shared/Context";
import ActionConfBranchSelector from "components/repo-selector/ActionConfBranchSelector";
import DetectContentsList from "components/repo-selector/DetectContentsList";

type PropsType = RouteComponentProps & {
  source: SourceType | undefined;
  templateName: string;
  setTemplateName: (x: string) => void;
  setValuesToOverride: (x: any) => void;
  setPage: (x: string) => void;
  sourceType: string;
  setSourceType: (x: string) => void;

  imageUrl: string;
  setImageUrl: (x: string) => void;
  imageTag: string;
  setImageTag: (x: string) => void;

  hasSource?: string;

  actionConfig: ActionConfigType;
  setActionConfig: (
    x: ActionConfigType | ((prevState: ActionConfigType) => ActionConfigType)
  ) => void;
  procfileProcess: string;
  setProcfileProcess: (x: string) => void;
  branch: string;
  setBranch: (x: string) => void;
  repoType: string;
  setRepoType: (x: string) => void;
  dockerfilePath: string | null;
  setDockerfilePath: (x: string) => void;
  procfilePath: string | null;
  setProcfilePath: (x: string) => void;
  folderPath: string | null;
  setFolderPath: (x: string) => void;
  selectedRegistry: any;
  setSelectedRegistry: (x: string) => void;
  setBuildConfig: (x: any) => void;
};
const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
  kind: "github",
};
type StateType = {};
class SourceSettings extends Component<PropsType, StateType> {
  renderGithubSettings = () => {
    return (
      <>
        <Text size={16}>Build settings</Text>
        <Spacer y={0.5} />
        <Text color="helper">Select your Github repository.</Text>
        <Spacer y={0.5} />
        {/* <Input
                    placeholder="ex: academic-sophon"
                    value=""
                    width="100%"
                    setValue={(e) => { }}
                /> */}
        {
          <>
            {" "}
            <Subtitle>
              Provide a repo folder to use as source.
              {/* <Highlight
                onClick={() => this.context.setCurrentModal("AccountSettingsModal", {})}
              >
                Manage Git repos
              </Highlight> */}
              <Required>*</Required>
              <ActionConfEditorStack
                actionConfig={this.props.actionConfig}
                branch={this.props.branch}
                setActionConfig={(actionConfig: ActionConfigType) => {
                  this.props.setActionConfig(
                    (currentActionConfig: ActionConfigType) => ({
                      ...currentActionConfig,
                      ...actionConfig,
                    })
                  );
                  this.props.setImageUrl(actionConfig.image_repo_uri);
                  /*
            setParentState({ actionConfig }, () =>
              setParentState({ imageUrl: actionConfig.image_repo_uri })
            )
            */
                }}
                procfileProcess={this.props.procfileProcess}
                setProcfileProcess={(procfileProcess: string) => {
                  this.props.setProcfileProcess(procfileProcess);
                  this.props.setValuesToOverride((v: any) => ({
                    ...v,
                    "container.command": procfileProcess || "",
                    showStartCommand: !procfileProcess,
                  }));
                }}
                setBranch={this.props.setBranch}
                setDockerfilePath={this.props.setDockerfilePath}
                setProcfilePath={this.props.setProcfilePath}
                procfilePath={this.props.procfilePath}
                dockerfilePath={this.props.dockerfilePath}
                folderPath={this.props.folderPath}
                setFolderPath={this.props.setFolderPath}
                reset={() => {
                  this.props.setActionConfig({ ...defaultActionConfig });
                  this.props.setBranch("");
                  this.props.setDockerfilePath(null);
                  this.props.setFolderPath(null);
                }}
                setSelectedRegistry={this.props.setSelectedRegistry}
                selectedRegistry={this.props.selectedRegistry}
                setBuildConfig={this.props.setBuildConfig}
              />
            </Subtitle>
            <DarkMatter antiHeight="-4px" />
            <br />
          </>
        }
        <Spacer y={0.5} />
        {this.props.actionConfig.git_repo ? (
          <>
            <Text color="helper">Select your branch.</Text>
            <ActionConfBranchSelector
              actionConfig={this.props.actionConfig}
              branch={this.props.branch}
              setActionConfig={(actionConfig: ActionConfigType) => {
                this.props.setActionConfig(
                  (currentActionConfig: ActionConfigType) => ({
                    ...currentActionConfig,
                    ...actionConfig,
                  })
                );
                this.props.setImageUrl(actionConfig.image_repo_uri);
                /*
      setParentState({ actionConfig }, () =>
        setParentState({ imageUrl: actionConfig.image_repo_uri })
      )
      */
              }}
              procfileProcess={this.props.procfileProcess}
              setProcfileProcess={(procfileProcess: string) => {
                this.props.setProcfileProcess(procfileProcess);
                this.props.setValuesToOverride((v: any) => ({
                  ...v,
                  "container.command": procfileProcess || "",
                  showStartCommand: !procfileProcess,
                }));
              }}
              setBranch={this.props.setBranch}
              setDockerfilePath={this.props.setDockerfilePath}
              setProcfilePath={this.props.setProcfilePath}
              procfilePath={this.props.procfilePath}
              dockerfilePath={this.props.dockerfilePath}
              folderPath={this.props.folderPath}
              setFolderPath={this.props.setFolderPath}
              reset={() => {
                this.props.setActionConfig({ ...defaultActionConfig });
                this.props.setBranch("");
                this.props.setDockerfilePath(null);
                this.props.setFolderPath(null);
              }}
              setSelectedRegistry={this.props.setSelectedRegistry}
              selectedRegistry={this.props.selectedRegistry}
              setBuildConfig={this.props.setBuildConfig}
            />
          </>
        ) : (
          <></>
        )}
        <Spacer y={0.5} />
        <Spacer y={0.5} />
        <Text color="helper">Specify your application root path.</Text>
        <Spacer y={0.5} />
        <Input
          disabled={!this.props.branch ? true : false}
          placeholder="ex: ./"
          value={this.props.folderPath}
          width="100%"
          setValue={this.props.setFolderPath}
        />
        {/* <Spacer y={0.5} />
        <Text color="helper">
          Specify your porter.yaml path. <a>&nbsp;What is this?</a>
        </Text>
        <Spacer y={0.5} />
        <Input
          placeholder="ex: ./porter.yaml"
          value=""
          width="100%"
          setValue={(e) => {}}
        />
        */}
        {this.props.actionConfig.git_repo && this.props.branch ? (
          <DetectContentsList
            actionConfig={this.props.actionConfig}
            branch={this.props.branch}
            dockerfilePath={this.props.dockerfilePath}
            procfilePath={this.props.procfilePath}
            folderPath={this.props.folderPath}
            setActionConfig={this.props.setActionConfig}
            setDockerfilePath={(x: string) => this.props.setDockerfilePath(x)}
            setProcfilePath={(x: string) => this.props.setProcfilePath(x)}
            setProcfileProcess={(x: string) => this.props.setProcfileProcess(x)}
            setFolderPath={(x: string) => this.props.setFolderPath(x)}
          />
        ) : (
          <></>
        )}
        <Spacer y={1} />
        <DetectedBuildMessage>
          <i className="material-icons">check</i>
          Detected Dockerfile at ./Dockerfile
        </DetectedBuildMessage>
        <Spacer y={1} />
        <AdvancedBuildSettings />
      </>
    );
  };

  renderDockerSettings = () => {
    return (
      <>
        <Text size={16}>Registry settings</Text>
        <Spacer y={0.5} />
        <Text color="helper">Select your Github repository.</Text>
        <Spacer height="20px" />
        <Input
          placeholder="ex: academic-sophon"
          value=""
          width="100%"
          setValue={(e) => {}}
        />
        <Spacer y={0.5} />
        <Text color="helper">Select your branch.</Text>
      </>
    );
  };

  render() {
    return (
      <SourceSettingsContainer source={this.props.source}>
        <AnimateHeight height={this.props.source ? "auto" : 0}>
          <div>
            {this.props.source === "github"
              ? this.renderGithubSettings()
              : this.renderDockerSettings()}
          </div>
        </AnimateHeight>
      </SourceSettingsContainer>
    );
  }
}

export default SourceSettings;

const SourceSettingsContainer = styled.div`
  margin-top: ${(props: { source: SourceType | undefined }) =>
    props.source && "20px"};
`;
const DetectedBuildMessage = styled.div`
  color: #0f872b;
  display: flex;
  align-items: center;
  border-radius: 5px;
  margin-right: 10px;

  > i {
    margin-right: 6px;
    font-size: 20px;
    border-radius: 20px;
    transform: none;
  }
`;

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;

const StyledSourcePage = styled.div`
  position: relative;
  margin-top: -5px;
`;

const Buffer = styled.div`
  width: 100%;
  height: 15px;
`;

const Br = styled.div`
  width: 100%;
  height: 5px;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 50%;
  right: 12px;
  top: 10px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }

  > i {
    font-size: 20px;
    color: #aaaabb;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const BlockIcon = styled.img<{ bw?: boolean }>`
  height: 38px;
  padding: 2px;
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
  display: flex;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 3px 0px 12px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: ${(props) => (props.disabled ? "" : "pointer")};
  color: #ffffff;
  position: relative;

  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
  }
  :hover {
    border: ${(props) => (props.disabled ? "" : "1px solid #7a7b80")};
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

const BlockList = styled.div`
  overflow: visible;
  margin-top: 6px;
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

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: -15px;
  margin-bottom: -6px;
`;

const Warning = styled.span`
  color: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.highlight ? "#f5cb42" : ""};
  margin-left: ${(props: { highlight: boolean; makeFlush?: boolean }) =>
    props.makeFlush ? "" : "5px"};
`;

const Highlight = styled.a`
  color: #8590ff;
  text-decoration: none;
  margin-left: 5px;
  cursor: pointer;
  display: inline;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 25px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;
