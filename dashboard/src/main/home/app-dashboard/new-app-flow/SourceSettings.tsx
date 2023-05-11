import AnimateHeight from "react-animate-height";
import React, { Component, useEffect } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AdvancedBuildSettings from "./AdvancedBuildSettings";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";
import ActionConfEditorStack from "components/repo-selector/ActionConfEditorStack";
import { ActionConfigType, BuildConfig } from "shared/types";
import { RouteComponentProps } from "react-router";
import { Context } from "shared/Context";
import ActionConfBranchSelector from "components/repo-selector/ActionConfBranchSelector";
import DetectContentsList from "components/repo-selector/DetectContentsList";
import { pushFiltered } from "shared/routing";
import ImageSelector from "components/image-selector/ImageSelector";
import SharedBuildSettings from "../expanded-app/SharedBuildSettings";
type Props = {
  source: SourceType | undefined;
  imageUrl: string;
  setImageUrl: (x: string) => void;
  imageTag: string;
  setImageTag: (x: string) => void;
  actionConfig: ActionConfigType;
  setActionConfig: (
    x: ActionConfigType | ((prevState: ActionConfigType) => ActionConfigType)
  ) => void;
  branch: string;
  setBranch: (x: string) => void;
  dockerfilePath: string | null;
  setDockerfilePath: (x: string) => void;
  procfilePath: string | null;
  setProcfilePath: (x: string) => void;
  folderPath: string | null;
  setFolderPath: (x: string) => void;
  setBuildConfig: (x: any) => void;
  porterYaml: string;
  setPorterYaml: (x: any) => void;
  buildView: string;
  setBuildView: (x: string) => void;
  setCurrentStep: (x: number) => void;
  currentStep: number;
  porterYamlPath: string;
  setPorterYamlPath: (x: string) => void;
};

const SourceSettings: React.FC<Props> = ({
  source,
  imageUrl,
  setImageUrl,
  imageTag,
  setImageTag,
  actionConfig,
  setActionConfig,
  branch,
  setBranch,
  dockerfilePath,
  setDockerfilePath,
  folderPath,
  setFolderPath,
  setBuildConfig,
  porterYaml,
  setPorterYaml,
  buildView,
  setBuildView,
  setCurrentStep,
  currentStep,
  setPorterYamlPath,
  porterYamlPath,
  ...props
}) => {
  const renderDockerSettings = () => {
    setFolderPath("");
    setDockerfilePath("");
    setBuildView("buildpacks");
    setPorterYamlPath("");
    setBranch("");
    return (
      <>
        {/* /* <Text size={16}>Registry settings</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          Specify the complete registry URL for your Docker image:
        </Text>
        <Spacer height="20px" />
        <Input
          placeholder="ex: nginx"
          value={imageUrl}
          width="300px"
          setValue={setImageUrl}
        /> */}

        <StyledSourceBox>
          {/* <CloseButton
            onClick={() => {
              setSourceType("");
              setImageUrl("");
              setImageTag("");
            }}
          >
            <i className="material-icons">close</i>
          </CloseButton> */}
          <Subtitle>
            Specify the container image you would like to connect to this
            template.
            <Highlight
              onClick={() =>
                pushFiltered(props, "/integrations/registry", ["project_id"])
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
      </>
    );
  };

  return (
    <SourceSettingsContainer>
      {source && <Spacer y={1} />}
      <AnimateHeight height={source ? "auto" : 0}>
        <div>
          {source === "github" ? (
            <SharedBuildSettings
              actionConfig={actionConfig}
              branch={branch}
              dockerfilePath={dockerfilePath}
              folderPath={folderPath}
              setActionConfig={setActionConfig}
              setDockerfilePath={setDockerfilePath}
              setFolderPath={setFolderPath}
              setBuildConfig={setBuildConfig}
              porterYaml={porterYaml}
              setPorterYaml={setPorterYaml}
              setBranch={setBranch}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              buildView={buildView}
              setBuildView={setBuildView}
              porterYamlPath={porterYamlPath}
              setPorterYamlPath={setPorterYamlPath}
            />
          ) : (
            renderDockerSettings()
          )}
        </div>
      </AnimateHeight>
    </SourceSettingsContainer>
  );
};

export default SourceSettings;

const SourceSettingsContainer = styled.div``;

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

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
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
