import React, { Component } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { RouteComponentProps, withRouter } from "react-router";
import close from "assets/close.png";
import { isAlphanumeric } from "shared/common";
import { pushFiltered } from "shared/routing";

import InputRow from "components/form-components/InputRow";
import Helper from "components/form-components/Helper";
import ImageSelector from "components/image-selector/ImageSelector";
import ActionConfEditor from "components/repo-selector/ActionConfEditor";
import SaveButton from "components/SaveButton";
import { ActionConfigType } from "shared/types";

type PropsType = RouteComponentProps & {
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

type StateType = {};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_branch: "",
  git_repo_id: 0,
};

class SourcePage extends Component<PropsType, StateType> {
  renderSourceSelector = () => {
    let { capabilities, setCurrentModal } = this.context;
    let { sourceType, setSourceType } = this.props;

    if (sourceType === "") {
      return (
        <BlockList>
          {capabilities.github || capabilities.gitlab ? (
            <Block onClick={() => setSourceType("repo")}>
              <BlockIcon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
              <BlockTitle>Git repository</BlockTitle>
              <BlockDescription>
                Deploy using source from a Git repo.
              </BlockDescription>
            </Block>
          ) : null}
          <Block onClick={() => setSourceType("registry")}>
            <BlockIcon src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png" />
            <BlockTitle>Docker registry</BlockTitle>
            <BlockDescription>
              Deploy a container from an image registry.
            </BlockDescription>
          </Block>
        </BlockList>
      );
    }

    // Display image selector
    if (sourceType === "registry") {
      let { imageUrl, setImageUrl, imageTag, setImageTag } = this.props;
      return (
        <StyledSourceBox>
          <CloseButton
            onClick={() => {
              setSourceType("");
              setImageUrl("");
              setImageTag("");
            }}
          >
            <CloseButtonImg src={close} />
          </CloseButton>
          <Subtitle>
            Specify the container image you would like to connect to this
            template.
            <Highlight
              onClick={() =>
                pushFiltered(this.props, "/integrations/registry", [
                  "project_id",
                ])
              }
            >
              Manage Docker registries
            </Highlight>
            <Required>*</Required>
          </Subtitle>
          <DarkMatter antiHeight="-4px" />
          <ImageSelector
            selectedTag={imageTag}
            selectedImageUrl={imageUrl}
            setSelectedImageUrl={setImageUrl}
            setSelectedTag={setImageTag}
            forceExpanded={true}
          />
          <br />
        </StyledSourceBox>
      );
    }

    // Display repo selector
    let {
      history,
      setValuesToOverride,
      setImageUrl,
      actionConfig,
      setActionConfig,
      branch,
      setBranch,
      procfileProcess,
      setProcfileProcess,
      dockerfilePath,
      setDockerfilePath,
      procfilePath,
      setProcfilePath,
      folderPath,
      setFolderPath,
      selectedRegistry,
      setSelectedRegistry,
      setBuildConfig,
    } = this.props;
    return (
      <StyledSourceBox>
        <CloseButton
          onClick={() => {
            setSourceType("");
            setDockerfilePath("");
            setFolderPath("");
            setProcfilePath("");
            setProcfileProcess("");
          }}
        >
          <CloseButtonImg src={close} />
        </CloseButton>
        <Subtitle>
          Provide a repo folder to use as source.
          <Highlight
            onClick={() => setCurrentModal("AccountSettingsModal", {})}
          >
            Manage Git repos
          </Highlight>
          <Required>*</Required>
        </Subtitle>
        <DarkMatter antiHeight="-4px" />
        <ActionConfEditor
          actionConfig={actionConfig}
          branch={branch}
          setActionConfig={(actionConfig: ActionConfigType) => {
            setActionConfig((currentActionConfig: ActionConfigType) => ({
              ...currentActionConfig,
              ...actionConfig,
            }));
            setImageUrl(actionConfig.image_repo_uri);
            /*
            setParentState({ actionConfig }, () =>
              setParentState({ imageUrl: actionConfig.image_repo_uri })
            )
            */
          }}
          procfileProcess={procfileProcess}
          setProcfileProcess={(procfileProcess: string) => {
            setProcfileProcess(procfileProcess);
            setValuesToOverride((v: any) => ({
              ...v,
              "container.command": procfileProcess || "",
              showStartCommand: !procfileProcess,
            }));
          }}
          setBranch={setBranch}
          setDockerfilePath={setDockerfilePath}
          setProcfilePath={setProcfilePath}
          procfilePath={procfilePath}
          dockerfilePath={dockerfilePath}
          folderPath={folderPath}
          setFolderPath={setFolderPath}
          reset={() => {
            setActionConfig({ ...defaultActionConfig });
            setBranch("");
            setDockerfilePath(null);
            setFolderPath(null);
          }}
          setSelectedRegistry={setSelectedRegistry}
          selectedRegistry={selectedRegistry}
          setBuildConfig={setBuildConfig}
        />
        <br />
      </StyledSourceBox>
    );
  };

  checkSourceSelected = () => {
    let { imageUrl, selectedRegistry } = this.props;
    return imageUrl || selectedRegistry;
  };

  // TODO: consolidate status w/ helper at button-level
  getButtonStatus = () => {
    let { imageUrl, selectedRegistry, imageTag, templateName } = this.props;
    if (!isAlphanumeric(templateName) && templateName !== "") {
      return "Name contains illegal characters";
    }
    if (imageUrl || selectedRegistry) {
      return "";
    }
    return "No source selected";
  };

  getButtonHelper = () => {
    let { imageUrl, imageTag } = this.props;
    if (imageUrl && !imageTag) {
      return 'Tag "latest" will be used by default';
    }
  };

  handleContinue = () => {
    const { setPage } = this.props;
    setPage("settings");
  };

  render() {
    let { templateName, setTemplateName } = this.props;

    return (
      <StyledSourcePage>
        <Heading>Name</Heading>
        <Helper>
          Randomly generated if left blank
          <Warning
            highlight={!isAlphanumeric(templateName) && templateName !== ""}
          >
            (lowercase letters, numbers, and "-" only)
          </Warning>
        </Helper>
        <InputWrapper>
          <InputRow
            type="string"
            value={templateName}
            setValue={setTemplateName}
            placeholder="ex: perspective-vortex"
            width="470px"
          />
        </InputWrapper>
        <Heading>Deployment Method</Heading>
        <Helper>
          Deploy from a Git repository or a Docker registry:
          <Required>*</Required>
        </Helper>
        <Br />
        {this.renderSourceSelector()}
        <Helper>
          Learn more about
          <Highlight
            href="https://docs.porter.run/deploying-applications/overview"
            target="_blank"
          >
            deploying services to Porter
          </Highlight>
        </Helper>
        <Buffer />
        <SaveButton
          text="Continue"
          disabled={!this.checkSourceSelected()}
          onClick={this.handleContinue}
          status={this.getButtonStatus()}
          makeFlush={true}
          helper={this.getButtonHelper()}
        />
      </StyledSourcePage>
    );
  }
}

SourcePage.contextType = Context;
export default withRouter(SourcePage);

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
  height: 35px;
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
  background: #262a30;
  border: 1px solid #494b4f;
  :hover {
    
  }
  :hover {
    border: ${(props) => props.disabled ? "" : "1px solid #7a7b80"};
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
  background: #ffffff11;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 25px;
`;
