import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ActionConfBranchSelector from "main/home/app-dashboard/build-settings/ActionConfBranchSelector";
import ActionConfEditorStack from "main/home/app-dashboard/build-settings/ActionConfEditorStack";
import DetectContentsList from "main/home/app-dashboard/build-settings/DetectContentsList";
import React from "react";
import { ActionConfigType, BuildConfig } from "shared/types";
import styled from "styled-components";
import { PorterApp } from "../types/porterApp";

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
  setImageUrl: (x: string) => void;
  buildView: string;
  setBuildView: (x: string) => void;
  porterYamlPath: string;
  setPorterYamlPath: (x: string) => void;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  git_repo: string;
  git_repo_id: number;
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
  setImageUrl,
  buildView,
  setBuildView,
  porterYamlPath,
  setPorterYamlPath,
  updatePorterApp,
  git_repo,
  git_repo_id,
}) => {
  return (
    <>
      <Text size={16}>Build settings</Text>
      <Spacer y={0.5} />
      <Text color="helper">Specify your GitHub repository.</Text>
      <Spacer y={0.5} />
      <ActionConfEditorStack
        git_repo={git_repo}
        updatePorterApp={updatePorterApp}
        setBuildView={setBuildView}
      />
      <DarkMatter antiHeight="-4px" />
      <Spacer y={0.3} />
      {git_repo && (
        <>
          <Spacer y={0.5} />
          <Text color="helper">Specify your GitHub branch.</Text>
          <Spacer y={0.5} />
          <ActionConfBranchSelector
            git_repo={git_repo}
            setBuildView={setBuildView}
            updatePorterApp={updatePorterApp}
            branch={branch}
            git_repo_id={git_repo_id}
          />
        </>
      )}
      <Spacer y={0.3} />
      {git_repo && branch && (
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

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

