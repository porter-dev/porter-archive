import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ActionConfBranchSelector from "components/repo-selector/ActionConfBranchSelector";
import ActionConfEditorStack from "components/repo-selector/ActionConfEditorStack";
import DetectContentsList from "components/repo-selector/DetectContentsList";
import React, { useEffect, useState } from "react";
import AnimateHeight from "react-animate-height";
import { ActionConfigType, BuildConfig } from "shared/types";
import styled from "styled-components";

type Props = {
  actionConfig: ActionConfigType;
  setActionConfig: (
    x: ActionConfigType | ((prevState: ActionConfigType) => ActionConfigType)
  ) => void;
  branch: string;
  setBranch: (x: string) => void;
  dockerfilePath: string | null;
  setDockerfilePath: (x: string) => void;
  folderPath: string;
  setFolderPath: (x: string) => void;
  setBuildConfig: (x: any) => void;
  porterYaml: string;
  setPorterYaml: (x: any) => void;
  imageUrl: string;
  setImageUrl: (x: string) => void;
  buildView: string;
  setBuildView: (x: string) => void;
  porterYamlPath: string;
  setPorterYamlPath: (x: string) => void;
};

const SharedBuildSettings: React.FC<Props> = ({
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
  imageUrl,
  setImageUrl,
  buildView,
  setBuildView,
  porterYamlPath,
  setPorterYamlPath,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      <Text color="helper">Specify your GitHub repository.</Text>
      <Spacer y={0.5} />
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
        setBuildView={setBuildView}
        setPorterYamlPath={setPorterYamlPath}
      />
      <DarkMatter antiHeight="-4px" />
      <Spacer y={0.3} />
      {actionConfig.git_repo && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">Specify your GitHub branch.</Text>
          <Spacer y={0.5} />
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
            setBuildView={setBuildView}
            setPorterYamlPath={setPorterYamlPath}
          />
        </>
      )}
      <Spacer y={0.3} />
      {actionConfig.git_repo && branch && (
        <>
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
          <Spacer y={1} />

          {porterYamlPath != "porter.yaml" && porterYamlPath && (
            <>
              <Text color="helper">Porter.yaml path:</Text>
              <Spacer y={0.5} />
              <Input
                disabled={true}
                placeholder="ex: ./"
                value={porterYamlPath}
                width="100%"
                setValue={setPorterYamlPath}
              />
              <Spacer y={1} />
            </>
          )}
          <DetectContentsList
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
            buildView={buildView}
            setBuildView={setBuildView}
            porterYamlPath={porterYamlPath}
            setPorterYamlPath={setPorterYamlPath}
          />
        </>
      )}
    </>
  );
};

export default SharedBuildSettings;

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
