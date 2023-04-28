import AnimateHeight from "react-animate-height";
import React, { Component, Dispatch, useMemo, useRef, useState } from "react";
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
  FullActionConfigType,
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
import { BuildpackSelection } from "components/repo-selector/BuildpackSelection";
import BuildpackConfigSection from "main/home/cluster-dashboard/expanded-chart/build-settings/_BuildpackConfigSection";
import { BuildpackStack } from "components/repo-selector/BuildpackStack";
type Props = {
  appData: any;
  setAppData: Dispatch<any>;
};

const BuildSettingsTabStack: React.FC<Props> = ({ appData, setAppData }) => {
  const [updated, setUpdated] = useState(null);
  const [branch, setBranch] = useState(appData.app.git_branch);
  const [showSettings, setShowSettings] = useState(false);
  const [dockerfilePath, setDockerfilePath] = useState(
    appData.app.dockerfilePath
  );
  const [folderPath, setFolderPath] = useState("./");
  const defaultActionConfig: ActionConfigType = {
    git_repo: appData.app.repo_name,
    image_repo_uri: appData.chart.image_repo_uri,
    git_branch: appData.app.git_branch,
    git_repo_id: appData.app.repo_id,
    kind: "github",
  };
  const defaultBuildConfig: BuildConfig = {
    builder: appData.app.builder,
    buildpacks: appData.app.build_packs?.split(","),
    config: appData.chart.config,
  };
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    ...defaultBuildConfig,
  });
  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    ...defaultActionConfig,
  });

  const [imageUrl, setImageUrl] = useState(appData.chart.image_uri);

  const buildpackConfigRef = useRef<{
    isLoading: boolean;
    getBuildConfig: () => BuildConfig;
  }>(null);

  const currentActionConfig = useMemo(() => {
    console.log(appData.chart.config);
    console.log(appData);
    const actionConf = appData.chart.config;

    return {
      kind: "github",
      ...actionConf,
    } as FullActionConfigType;
  }, [appData.chart]);

  return (
    <>
      <Text size={16}>Build settings</Text>
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
      <DarkMatter antiHeight="-4px" />
      <br />
      {actionConfig.git_repo && (
        <>
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
      <StyledAdvancedBuildSettings
        showSettings={showSettings}
        isCurrent={true}
        onClick={() => {
          setShowSettings(!showSettings);
        }}
      >
        <AdvancedBuildTitle>
          <i className="material-icons dropdown">arrow_drop_down</i>
          Configure Build Pack Settings
        </AdvancedBuildTitle>
      </StyledAdvancedBuildSettings>
      <AnimateHeight height={showSettings ? "auto" : 0} duration={1000}>
        <StyledSourceBox>
          {actionConfig && (
            <BuildpackStack
              actionConfig={actionConfig}
              branch={branch}
              folderPath={folderPath}
              onChange={(config) => {
                setBuildConfig(config);
                setDockerfilePath("");
              }}
              hide={!showSettings}
            />
          )}
        </StyledSourceBox>
      </AnimateHeight>
    </>
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
const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};

  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean; isCurrent: boolean }) =>
      props.showSettings ? "" : "rotate(-90deg)"};
  }
`;
const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;
