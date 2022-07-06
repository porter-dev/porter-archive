import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import KeyValueArray from "components/form-components/KeyValueArray";
import MultiSaveButton from "components/MultiSaveButton";
import _ from "lodash";
import React, { useContext, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import {
  BuildConfig,
  ChartTypeWithExtendedConfig,
  FullActionConfigType,
} from "shared/types";
import styled, { keyframes } from "styled-components";
import yaml from "js-yaml";
import { AxiosError } from "axios";
import BranchList from "components/repo-selector/BranchList";
import Banner from "components/Banner";
import { UpdateBuildconfigResponse } from "./types";
import BuildpackConfigSection from "./_BuildpackConfigSection";

type Props = {
  chart: ChartTypeWithExtendedConfig;
  isPreviousVersion: boolean;
};

const BuildSettingsTab: React.FC<Props> = ({ chart, isPreviousVersion }) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [envVariables, setEnvVariables] = useState(
    chart.config?.container?.env?.build || null
  );
  const [runningWorkflowURL, setRunningWorkflowURL] = useState("");
  const [reRunError, setReRunError] = useState<{
    title: string;
    description: string;
  }>(null);
  const [buttonStatus, setButtonStatus] = useState<
    "loading" | "successful" | string
  >("");

  const [currentBranch, setCurrentBranch] = useState(
    () => chart?.git_action_config?.git_branch
  );

  const buildpackConfigRef = useRef<{
    isLoading: boolean;
    getBuildConfig: () => BuildConfig;
  }>(null);

  const saveNewBranch = async (newBranch: string) => {
    if (!newBranch?.length) {
      return;
    }

    if (newBranch === chart?.git_action_config?.git_branch) {
      return;
    }

    const newGitActionConfig: FullActionConfigType = {
      ...chart.git_action_config,
      git_branch: newBranch,
    };

    try {
      api.updateGitActionConfig(
        "<token>",
        {
          git_action_config: newGitActionConfig,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          release_name: chart.name,
          namespace: chart.namespace,
        }
      );
    } catch (error) {
      throw error;
    }
  };

  const saveBuildConfig = async (config: BuildConfig) => {
    console.log({ config });
    if (config === null) {
      return;
    }

    try {
      await api.updateBuildConfig<UpdateBuildconfigResponse>(
        "<token>",
        { ...config },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: chart.namespace,
          release_name: chart.name,
        }
      );
    } catch (err) {
      throw err;
    }
  };

  const saveEnvVariables = async (envs: { [key: string]: string }) => {
    let values = { ...chart.config };
    if (envs === null) {
      return;
    }

    values.container.env.build = { ...envs };
    const valuesYaml = yaml.dump({ ...values });
    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values: valuesYaml,
        },
        {
          id: currentProject.id,
          namespace: chart.namespace,
          name: chart.name,
          cluster_id: currentCluster.id,
        }
      );
    } catch (error) {
      throw error;
    }
  };

  const triggerWorkflow = async () => {
    try {
      await api.reRunGHWorkflow(
        "",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          git_installation_id: chart.git_action_config?.git_repo_id,
          owner: chart.git_action_config?.git_repo?.split("/")[0],
          name: chart.git_action_config?.git_repo?.split("/")[1],
          branch: chart.git_action_config?.git_branch,
          release_name: chart.name,
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

  const clearButtonStatus = (time: number = 800) => {
    setTimeout(() => {
      setButtonStatus("");
    }, time);
  };

  const getBuildConfig = () => {
    if (buildpackConfigRef.current?.isLoading) {
      return null;
    }
    return buildpackConfigRef.current?.getBuildConfig() || null;
  };

  const handleSave = async () => {
    setButtonStatus("loading");

    const buildConfig = getBuildConfig();

    if (!buildConfig && !chart.git_action_config.dockerfile_path) {
      setButtonStatus("Can't save until buildpack config is loaded.");
      clearButtonStatus(1500);
      return;
    }

    try {
      await saveBuildConfig(buildConfig);
      await saveNewBranch(currentBranch);
      await saveEnvVariables(envVariables);
      setButtonStatus("successful");
    } catch (error) {
      setButtonStatus("Something went wrong");
      setCurrentError(error);
    } finally {
      clearButtonStatus();
    }
  };

  const handleSaveAndReDeploy = async () => {
    setButtonStatus("loading");

    const buildConfig = getBuildConfig();

    if (!buildConfig && !chart.git_action_config.dockerfile_path) {
      setButtonStatus("Can't save until buildpack config is loaded.");
      clearButtonStatus();
      return;
    }

    try {
      await saveBuildConfig(buildConfig);
      await saveNewBranch(currentBranch);
      await saveEnvVariables(envVariables);
      await triggerWorkflow();
      setButtonStatus("successful");
    } catch (error) {
      setButtonStatus("Something went wrong");
      setCurrentError(error);
    } finally {
      clearButtonStatus();
    }
  };

  const currentActionConfig = useMemo(() => {
    const actionConf = chart.git_action_config;
    if (actionConf && actionConf.gitlab_integration_id) {
      return {
        kind: "gitlab",
        ...actionConf,
      } as FullActionConfigType;
    }

    return {
      kind: "github",
      ...actionConf,
    } as FullActionConfigType;
  }, [chart]);

  return (
    <Wrapper>
      {isPreviousVersion ? (
        <DisabledOverlay>
          Build config is disabled when reviewing past versions. Please go to
          the current revision to update your app build configuration.
        </DisabledOverlay>
      ) : null}
      <StyledSettingsSection blurContent={isPreviousVersion}>
        {/* {reRunError !== null ? (
        <AlertCard>
          <AlertCardIcon className="material-icons">error</AlertCardIcon>
          <AlertCardContent className="content">
            <AlertCardTitle className="title">
              {reRunError.title}
            </AlertCardTitle>
            {reRunError.description}
            {runningWorkflowURL.length ? (
              <>
                {" "}
                To go to the workflow{" "}
                <DynamicLink to={runningWorkflowURL} target="_blank">
                  click here
                </DynamicLink>
              </>
            ) : null}
          </AlertCardContent>
          <AlertCardAction
            onClick={() => {
              setReRunError(null);
              setRunningWorkflowURL("");
            }}
          >
            <span className="material-icons">close</span>
          </AlertCardAction>
        </AlertCard>
      ) : null} */}
        <Heading isAtTop>Build Environment Variables</Heading>
        <KeyValueArray
          values={envVariables}
          envLoader
          externalValues={{
            namespace: chart.namespace,
            clusterId: currentCluster.id,
          }}
          setValues={(values) => {
            setEnvVariables(values);
          }}
        ></KeyValueArray>

        <Heading>Select Default Branch</Heading>
        <Helper>
          Change the default branch the deployments will be made from.
        </Helper>
        <Banner>
          You must also update the deploy branch in your GitHub Action file.
        </Banner>
        <BranchList
          actionConfig={currentActionConfig}
          setBranch={setCurrentBranch}
          currentBranch={currentBranch}
        />

        {!chart.git_action_config.dockerfile_path ? (
          <>
            <Heading>Buildpack Settings</Heading>
            <BuildpackConfigSection
              ref={buildpackConfigRef}
              currentChart={chart}
              actionConfig={currentActionConfig}
            />
          </>
        ) : null}
        <SaveButtonWrapper>
          <MultiSaveButton
            options={[
              {
                text: "Save",
                onClick: handleSave,
                description:
                  "Save the build settings to be used in the next workflow run",
              },
              {
                text: "Save and Redeploy",
                onClick: handleSaveAndReDeploy,
                description:
                  "Immediately trigger a workflow run with updated build settings",
              },
            ]}
            disabled={false}
            makeFlush={true}
            clearPosition={true}
            statusPosition="left"
            expandTo="left"
            saveText=""
            status={buttonStatus}
          ></MultiSaveButton>
        </SaveButtonWrapper>
      </StyledSettingsSection>
    </Wrapper>
  );
};

export default BuildSettingsTab;

const DisabledOverlay = styled.div`
  position: absolute;
  width: 100%;
  height: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00000099;
  z-index: 1000;
  border-radius: 8px;
  padding: 0 35px;
  text-align: center;
`;

const SaveButtonWrapper = styled.div`
  width: 100%;
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
`;

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 65px;
  height: 100%;
`;

const StyledSettingsSection = styled.div<{ blurContent: boolean }>`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-top: 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  height: calc(100% - 55px);
  ${(props) => (props.blurContent ? "filter: blur(5px);" : "")}
`;

const AlertCard = styled.div`
  transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  border-radius: 4px;
  box-shadow: none;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.43;
  letter-spacing: 0.01071em;
  border: 1px solid rgb(229, 115, 115);
  display: flex;
  padding: 6px 16px;
  color: rgb(244, 199, 199);
  margin-top: 20px;
  position: relative;
`;

const AlertCardIcon = styled.span`
  color: rgb(239, 83, 80);
  margin-right: 12px;
  padding: 7px 0px;
  display: flex;
  font-size: 22px;
  opacity: 0.9;
`;

const AlertCardTitle = styled.div`
  margin: -2px 0px 0.35em;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.00938em;
  font-weight: 500;
`;

const AlertCardContent = styled.div`
  padding: 8px 0px;
`;

const AlertCardAction = styled.button`
  position: absolute;
  right: 5px;
  top: 5px;
  border: none;
  background-color: unset;
  color: white;
  :hover {
    cursor: pointer;
  }
`;
