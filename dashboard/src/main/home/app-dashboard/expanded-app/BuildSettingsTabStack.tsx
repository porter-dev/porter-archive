import AnimateHeight from "react-animate-height";
import React, { Component, Dispatch, useState } from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AdvancedBuildSettings from "../new-app-flow/AdvancedBuildSettings";
import styled from "styled-components";
import { SourceType } from "../new-app-flow/SourceSelector";
import ActionConfEditorStack from "components/repo-selector/ActionConfEditorStack";
import {
  ActionConfigType,
  BuildConfig,
  GithubActionConfigType,
} from "shared/types";
import { RouteComponentProps } from "react-router";
import { Context } from "shared/Context";
import ActionConfBranchSelector from "components/repo-selector/ActionConfBranchSelector";
import DetectContentsList from "components/repo-selector/DetectContentsList";
import { pushFiltered } from "shared/routing";
import ImageSelector from "components/image-selector/ImageSelector";
import SharedBuildSettings from "./SharedBuildSettings";
import Loading from "components/Loading";
type Props = {
  appData: any;
  setAppData: Dispatch<any>;
};

const BuildSettingsTabStack: React.FC<Props> = ({ appData, setAppData }) => {
  const [updated, setUpdated] = useState(null);
  const [branch, setBranch] = useState(appData.app.git_branch);
  const defaultActionConfig: GithubActionConfigType = {
    git_repo: appData.app.repo_name,
    image_repo_uri: appData.chart.image_uri,
    git_branch: appData.app.git_branch,
    git_repo_id: appData.app.repo_id,
    kind: "github",
  };
  const defaultBuildConfig: BuildConfig = {
    builder: appData.app.builder,
    buildpacks: appData.app.build_packs?.split(","),
    config: {},
  };
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    ...defaultBuildConfig,
  });
  const [actionConfig, setActionConfig] = useState<GithubActionConfigType>({
    ...defaultActionConfig,
  });

  return (
    <SharedBuildSettings
      actionConfig={actionConfig}
      branch={branch}
      dockerfilePath={"./"}
      folderPath={"./"}
      setActionConfig={setActionConfig}
      setDockerfilePath={() => {}}
      setFolderPath={() => {}}
      setBuildConfig={setBuildConfig}
      buildConfig={buildConfig}
      porterYaml={""}
      setPorterYaml={() => {}}
      setBranch={setBranch}
      imageUrl={""}
      setImageUrl={() => {}}
    />
  );
};

export default BuildSettingsTabStack;

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
