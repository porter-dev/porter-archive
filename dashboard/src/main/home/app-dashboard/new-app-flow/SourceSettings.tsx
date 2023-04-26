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
  procfileProcess: string;
  setProcfileProcess: (x: string) => void;
  branch: string;
  setBranch: (x: string) => void;
  dockerfilePath: string | null;
  setDockerfilePath: (x: string) => void;
  procfilePath: string | null;
  setProcfilePath: (x: string) => void;
  folderPath: string | null;
  setFolderPath: (x: string) => void;
  setBuildConfig: (x: any) => void;
};

const SourceSettings: React.FC<Props> = ({
  source,
  imageUrl,
  setImageUrl,
  imageTag,
  setImageTag,
  actionConfig,
  setActionConfig,
  setProcfileProcess,
  branch,
  setBranch,
  dockerfilePath,
  setDockerfilePath,
  procfilePath,
  setProcfilePath,
  folderPath,
  setFolderPath,
  setBuildConfig,
}) => {
  const renderGithubSettings = () => {
    return (
      <>
        <Text size={16}>Build settings</Text>
        <Spacer y={0.5} />
        <Text color="helper">Select your Github repository.</Text>
        <Spacer y={0.5} />
        <Subtitle>
          Provide a repo folder to use as source.
          <Required>*</Required>
          <ActionConfEditorStack
            actionConfig={actionConfig}
            setActionConfig={(actionConfig: ActionConfigType) => {
              setActionConfig((currentActionConfig: ActionConfigType) => ({
                ...currentActionConfig,
                ...actionConfig,
              }));
              setImageUrl(actionConfig.image_repo_uri);
            }}
            setBranch={setBranch}
            setDockerfilePath={setDockerfilePath}
            setFolderPath={setFolderPath}
          />
        </Subtitle>
        <DarkMatter antiHeight="-4px" />
        <br />
        <Spacer y={0.5} />
        {actionConfig.git_repo && (
          <>
            <Text color="helper">Select your branch.</Text>
            <ActionConfBranchSelector
              actionConfig={actionConfig}
              branch={branch}
              setActionConfig={(actionConfig: ActionConfigType) => {
                setActionConfig((currentActionConfig: ActionConfigType) => ({
                  ...currentActionConfig,
                  ...actionConfig,
                }));
                setImageUrl(actionConfig.image_repo_uri);
              }}
              setBranch={setBranch}
              setDockerfilePath={setDockerfilePath}
              setFolderPath={setFolderPath}
            />
          </>
        )}
        <Spacer y={1} />
        <Text color="helper">Specify your application root path.</Text>
        <Spacer y={0.5} />
        <Input
          disabled={!branch ? true : false}
          placeholder="ex: ./"
          value={folderPath}
          width="100%"
          setValue={setFolderPath}
        />
        {actionConfig.git_repo && branch && (
          <DetectContentsList
            actionConfig={actionConfig}
            branch={branch}
            dockerfilePath={dockerfilePath}
            procfilePath={procfilePath}
            folderPath={folderPath}
            setActionConfig={setActionConfig}
            setDockerfilePath={setDockerfilePath}
            setProcfilePath={setProcfilePath}
            setProcfileProcess={setProcfileProcess}
            setFolderPath={setFolderPath}
            setBuildConfig={setBuildConfig}
          />
        )}
      </>
    );
  };

  const renderDockerSettings = () => {
    return (
      <>
        <Text size={16}>Registry settings</Text>
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
        />
      </>
    );
  };

  return (
    <SourceSettingsContainer>
      {source && <Spacer y={1} />}
      <AnimateHeight height={source ? "auto" : 0}>
        <div>
          {source === "github"
            ? renderGithubSettings()
            : renderDockerSettings()}
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
