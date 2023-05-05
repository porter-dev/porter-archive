import AnimateHeight from "react-animate-height";
import React, {
  Component,
  Dispatch,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  PorterAppOptions,
} from "shared/types";
import { RouteComponentProps } from "react-router";
import { Context } from "shared/Context";
import ActionConfBranchSelector from "components/repo-selector/ActionConfBranchSelector";
import DetectContentsList from "components/repo-selector/DetectContentsList";
import { pushFiltered } from "shared/routing";
import ImageSelector from "components/image-selector/ImageSelector";
import SharedBuildSettings from "./SharedBuildSettings";
import { BuildpackSelection } from "components/repo-selector/BuildpackSelection";
import BuildpackConfigSection from "main/home/cluster-dashboard/expanded-chart/build-settings/_BuildpackConfigSection";
import { BuildpackStack } from "components/repo-selector/BuildpackStack";
import MultiSaveButton from "components/MultiSaveButton";
import api from "shared/api";
import { AxiosError } from "axios";
import InputRow from "components/form-components/InputRow";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Checkbox from "components/porter/Checkbox";
type Props = {
  appData: any;
  setAppData: Dispatch<any>;
  onTabSwitch: () => void;
  updatePorterApp: (options: Partial<PorterAppOptions>) => Promise<void>;
};
interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

const BuildSettingsTabStack: React.FC<Props> = ({
  appData,
  setAppData,
  onTabSwitch,
  updatePorterApp,
}) => {
  const { setCurrentError } = useContext(Context);
  const [updated, setUpdated] = useState(null);
  const [branch, setBranch] = useState(appData.app.git_branch);
  const [showSettings, setShowSettings] = useState(false);
  const [dockerfilePath, setDockerfilePath] = useState(appData.app.dockerfile);
  const [buildView, setBuildView] = useState<string>(
    appData.app.dockerfile ? "docker" : "buildpacks"
  );

  const [folderPath, setFolderPath] = useState("./");
  const defaultActionConfig: ActionConfigType = {
    git_repo: appData.app.repo_name,
    image_repo_uri: appData.chart.image_repo_uri,
    git_branch: appData.app.git_branch,
    git_repo_id: appData.app.git_repo_id,
    kind: "github",
  };
  const defaultBuildConfig: BuildConfig = {
    builder: appData.app.builder
      ? appData.app.builder
      : "paketobuildpacks/builder:full",
    buildpacks: appData.app.build_packs
      ? appData.app.build_packs.split(",")
      : [],
    config: appData.chart.config,
  };
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    ...defaultBuildConfig,
  });
  const [redeployOnSave, setRedeployOnSave] = useState(true);
  const [runningWorkflowURL, setRunningWorkflowURL] = useState("");
  const [autoBuildpack, setAutoBuildpack] = useState<AutoBuildpack>({
    valid: false,
    name: "",
  });

  const [actionConfig, setActionConfig] = useState<ActionConfigType>({
    ...defaultActionConfig,
  });
  const [buttonStatus, setButtonStatus] = useState<
    "loading" | "successful" | string
  >("");
  const [imageUrl, setImageUrl] = useState(appData.chart.image_uri);

  const triggerWorkflow = async () => {
    try {
      await api.reRunGHWorkflow(
        "",
        {},
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
          git_installation_id: appData.app.git_repo_id,
          owner: appData.app.repo_name?.split("/")[0],
          name: appData.app.repo_name?.split("/")[1],
          branch: branch,
          filename: "porter_stack_" + appData.chart.name + ".yml",
        }
      );
    } catch (error) {
      if (!error?.response) {
        throw error;
      }

      let tmpError: AxiosError = error;

      /**
       * @smell
       * Currently the expanded chart is clearing all the state when a chart update is triggered (saveEnvVariables).
       * Temporary usage of setCurrentError until a context is applied to keep the state of the ReRunError during re renders.
       */

      if (tmpError.response.status === 400) {
        // setReRunError({
        //   title: "No previous run found",
        //   description:
        //     "There are no previous runs for this workflow, please trigger manually a run before changing the build settings.",
        // });
        setCurrentError(
          "There are no previous runs for this workflow. Please manually trigger a run before changing build settings."
        );
        return;
      }

      if (tmpError.response.status === 409) {
        // setReRunError({
        //   title: "The workflow is still running",
        //   description:
        //     'If you want to make more changes, please choose the option "Save" until the workflow finishes.',
        // });

        if (typeof tmpError.response.data === "string") {
          setRunningWorkflowURL(tmpError.response.data);
        }
        setCurrentError(
          'The workflow is still running. You can "Save" the current build settings for the next workflow run and view the current status of the workflow here: ' +
          tmpError.response.data
        );
        return;
      }

      if (tmpError.response.status === 404) {
        let description = "No action file matching this deployment was found.";
        if (typeof tmpError.response.data === "string") {
          const filename = tmpError.response.data;
          description = description.concat(
            `Please check that the file "${filename}" exists in your repository.`
          );
        }
        // setReRunError({
        //   title: "The action doesn't seem to exist",
        //   description,
        // });

        setCurrentError(description);
        return;
      }
      throw error;
    }
  };
  const saveConfig = async () => {
    console.log(appData);
    console.log(appData.app.dockerfile);
    console.log(buildView);
    try {
      await updatePorterApp({
        repo_name: appData.app.repo_name,
        git_branch: branch,
        build_context: appData.app.build_context,
        builder: buildConfig.builder,
        buildpacks:
          buildView === "buildpacks"
            ? buildConfig?.buildpacks?.join(",")
            : "null",
        dockerfile: buildView === "buildpacks" ? "null" : dockerfilePath,
        image_repo_uri: appData.chart.image_repo_uri,
      });
      onTabSwitch();
    } catch (err) {
      throw err;
    }
  };
  const handleSave = async () => {
    setButtonStatus("loading");

    try {
      await saveConfig();
      setAppData(appData);

      onTabSwitch();
      setButtonStatus("success");
    } catch (error) {
      setButtonStatus("Something went wrong");
      console.log(error);
    }
  };
  const handleSaveAndReDeploy = async () => {
    setButtonStatus("loading");

    try {
      await saveConfig();
      setAppData(appData);

      await triggerWorkflow();

      onTabSwitch();
      setButtonStatus("successful");
    } catch (error) {
      setButtonStatus("Something went wrong");
      console.log(error);
    }
  };
  return (
    <>
      <Text size={16}>Build settings</Text>
      <InputRow
        disabled={true}
        label="Git repository"
        type="text"
        width="100%"
        value={actionConfig?.git_repo}
      />
      {/* <DarkMatter antiHeight="-1px" /> */}
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
            setBuildView={setBuildView}
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
        </>
      )}
      <AdvancedBuildSettings
        dockerfilePath={dockerfilePath}
        setDockerfilePath={setDockerfilePath}
        setBuildConfig={setBuildConfig}
        autoBuildPack={autoBuildpack}
        showSettings={false}
        buildView={buildView}
        setBuildView={setBuildView}
        actionConfig={actionConfig}
        branch={branch}
        folderPath={folderPath}
        currentBuildConfig={buildConfig}
      />
      <Spacer y={1} />
      <Checkbox
        checked={redeployOnSave}
        toggleChecked={() => setRedeployOnSave(!redeployOnSave)}
      >
        <Text>Re-run build and deploy on save</Text>
      </Checkbox>
      <Spacer y={1} />
      <Button
        onClick={() => {
          if (redeployOnSave) {
            handleSaveAndReDeploy();
          } else {
            handleSave();
          }
        }}
        status={buttonStatus}
      >
        Save build settings
      </Button>
    </>
  );
};

export default BuildSettingsTabStack;

const SourceSettingsContainer = styled.div``;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
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

const StyledButtonWrapper = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const StyledButton = styled.button`
  background: #3a48ca;
  border: 1px solid #494b4f;
  color: #ffffffff;
  cursor: pointer;
  font-size: 13px;
  padding: 8px 12px;
  position: relative;
  border-radius: 5px;
  margin-bottom: 35px;
  position: relative;
  text-align: center;
  transition: border 0.3s, color 0.3s;

  &:hover {
    border: 1px solid #7a7b80;
    color: white;
  }

  &::after {
    content: attr(data-description);
    background-color: #333;
    border-radius: 4px;
    bottom: calc(100% + 8px);
    color: #fff;
    font-size: 12px;
    opacity: 0;
    padding: 8px;
    position: absolute;
    left: 0;
    top: 100%;
    transform: translateY(0);
    white-space: nowrap;
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
    bottom: auto;
    top: 120%;
  }
`;

const StyledLoadingDial = styled(Loading)`
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
`;
