import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import KeyValueArray from "components/form-components/KeyValueArray";
import SelectRow from "components/form-components/SelectRow";
import Loading from "components/Loading";
import MultiSaveButton from "components/MultiSaveButton";
import { unionBy } from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import {
  BuildConfig,
  ChartTypeWithExtendedConfig,
  FullActionConfigType,
} from "shared/types";
import styled, { keyframes } from "styled-components";
import yaml from "js-yaml";
import DynamicLink from "components/DynamicLink";
import { AxiosError } from "axios";

const DEFAULT_PAKETO_STACK = "paketobuildpacks/builder:full";
const DEFAULT_HEROKU_STACK = "heroku/buildpacks:20";

type Buildpack = {
  name: string;
  buildpack: string;
  config: {
    [key: string]: string;
  };
};

type DetectedBuildpack = {
  name: string;
  builders: string[];
  detected: Buildpack[];
  others: Buildpack[];
};

type DetectBuildpackResponse = DetectedBuildpack[];

type UpdateBuildconfigResponse = {
  CreatedAt: string;
  DeletedAt: { Time: string; Valid: boolean };
  Time: string;
  Valid: boolean;
  ID: number;
  UpdatedAt: string;
  builder: string;
  buildpacks: string;
  config: string;
  name: string;
};

type Props = {
  chart: ChartTypeWithExtendedConfig;
};

const BuildSettingsTab: React.FC<Props> = ({ chart }) => {
  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [buildConfig, setBuildConfig] = useState<BuildConfig>(null);
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

  const saveBuildConfig = async (config: BuildConfig) => {
    if (config === null) {
      return;
    }

    if (!config.builder.length || !config.buildpacks.length) {
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
      console.log(error);
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
          "There are no previous runs for this workflow, please trigger manually a run before changing the build settings."
        );
        return;
      }

      if (tmpError.response.status === 409) {
        // setReRunError({
        //   title: "The workflow is still running",
        //   description:
        //     'If you want to make more changes, please choose the option "Save" until the workflow finishes.',
        // });

        // if (typeof tmpError.response.data === "string") {
        //   setRunningWorkflowURL(tmpError.response.data);
        // }
        setCurrentError(
          'The workflow is still running. If you want to make more changes, please choose the option "Save" until the workflow finishes. You can check the current status of the workflow here ' +
            tmpError.response.data
        );
        return;
      }

      if (tmpError.response.status === 404) {
        let description =
          "Apparently there's no action file that corresponds to this deployment.";
        if (typeof tmpError.response.data === "string") {
          const filename = tmpError.response.data;
          description = description.concat(
            `Please check that the file ${filename} exists on your repository.`
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

  const clearButtonStatus = () => {
    setTimeout(() => {
      setButtonStatus("");
    }, 800);
  };

  const handleSave = async () => {
    setButtonStatus("loading");
    try {
      await saveBuildConfig(buildConfig);
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
    try {
      await saveBuildConfig(buildConfig);
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

  return (
    <Wrapper>
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
      <StyledSettingsSection>
        <Heading isAtTop>Build step environment variables:</Heading>
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

        {!chart.git_action_config.dockerfile_path ? (
          <>
            <Heading>Buildpack settings</Heading>
            <BuildpackConfigSection
              currentChart={chart}
              actionConfig={chart.git_action_config}
              onChange={(buildConfig) => setBuildConfig(buildConfig)}
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
                  "Save the values to be applied in the next workflow run",
              },
              {
                text: "Save and re deploy",
                onClick: handleSaveAndReDeploy,
                description:
                  "Save the values and trigger the workflow to create a new deployment with the latest saved changes",
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

const BuildpackConfigSection: React.FC<{
  actionConfig: FullActionConfigType;
  currentChart: ChartTypeWithExtendedConfig;
  onChange: (buildConfig: BuildConfig) => void;
}> = ({ actionConfig, currentChart, onChange }) => {
  const { currentProject } = useContext(Context);

  const [builders, setBuilders] = useState<DetectedBuildpack[]>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<string>(null);

  const [stacks, setStacks] = useState<string[]>(null);
  const [selectedStack, setSelectedStack] = useState<string>(null);

  const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>([]);
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    []
  );

  useEffect(() => {
    const currentBuildConfig = currentChart?.build_config;

    if (!currentBuildConfig) {
      return;
    }

    api
      .detectBuildpack<DetectBuildpackResponse>(
        "<token>",
        {
          dir: actionConfig.folder_path || ".",
        },
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
          branch: actionConfig.git_branch,
        }
      )
      .then(({ data }) => {
        const builders = data;

        const defaultBuilder = builders.find((builder) =>
          builder.builders.find((stack) => stack === currentBuildConfig.builder)
        );

        const availableBuildpacks = defaultBuilder.others?.filter(
          (buildpack) => {
            if (!currentBuildConfig.buildpacks.includes(buildpack.buildpack)) {
              return true;
            }
            return false;
          }
        );

        const userAddedBuildpacks = defaultBuilder.others?.filter(
          (buildpack) => {
            if (currentBuildConfig.buildpacks.includes(buildpack.buildpack)) {
              return true;
            }
            return false;
          }
        );

        const detectedBuildpacks = unionBy(
          userAddedBuildpacks,
          defaultBuilder.detected,
          "buildpack"
        );

        const defaultStack = defaultBuilder.builders.find((stack) => {
          return stack === currentBuildConfig.builder;
        });

        setBuilders(builders);
        setSelectedBuilder(defaultBuilder.name.toLowerCase());

        setStacks(defaultBuilder.builders);
        setSelectedStack(defaultStack);
        if (!Array.isArray(detectedBuildpacks)) {
          setSelectedBuildpacks([]);
        } else {
          setSelectedBuildpacks(detectedBuildpacks);
        }
        if (!Array.isArray(availableBuildpacks)) {
          setAvailableBuildpacks([]);
        } else {
          setAvailableBuildpacks(availableBuildpacks);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [currentProject, actionConfig, currentChart]);

  useEffect(() => {
    let buildConfig: BuildConfig = {} as BuildConfig;

    buildConfig.builder = selectedStack;
    buildConfig.buildpacks = selectedBuildpacks?.map((buildpack) => {
      return buildpack.buildpack;
    });

    onChange(buildConfig);
  }, [selectedBuilder, selectedBuildpacks, selectedStack]);

  const builderOptions = useMemo(() => {
    if (!Array.isArray(builders)) {
      return;
    }

    return builders.map((builder) => ({
      label: builder.name,
      value: builder.name.toLowerCase(),
    }));
  }, [builders]);

  const stackOptions = useMemo(() => {
    if (!Array.isArray(stacks)) {
      return;
    }

    return stacks.map((stack) => ({
      label: stack,
      value: stack.toLowerCase(),
    }));
  }, [stacks]);

  const handleSelectBuilder = (builderName: string) => {
    const builder = builders.find(
      (b) => b.name.toLowerCase() === builderName.toLowerCase()
    );
    const detectedBuildpacks = builder.detected;
    const availableBuildpacks = builder.others;
    const defaultStack = builder.builders.find((stack) => {
      return stack === DEFAULT_HEROKU_STACK || stack === DEFAULT_PAKETO_STACK;
    });
    setSelectedBuilder(builderName);
    setBuilders(builders);
    setSelectedBuilder(builderName.toLowerCase());

    setStacks(builder.builders);
    setSelectedStack(defaultStack);

    if (!Array.isArray(detectedBuildpacks)) {
      setSelectedBuildpacks([]);
    } else {
      setSelectedBuildpacks(detectedBuildpacks);
    }
    if (!Array.isArray(availableBuildpacks)) {
      setAvailableBuildpacks([]);
    } else {
      setAvailableBuildpacks(availableBuildpacks);
    }
  };

  const renderBuildpacksList = (
    buildpacks: Buildpack[],
    action: "remove" | "add"
  ) => {
    return buildpacks?.map((buildpack) => {
      const icon = `devicon-${buildpack?.name?.toLowerCase()}-plain colored`;

      return (
        <StyledCard>
          <ContentContainer>
            <Icon className={icon} />
            <EventInformation>
              <EventName>{buildpack?.name}</EventName>
            </EventInformation>
          </ContentContainer>
          <ActionContainer>
            {action === "add" && (
              <DeleteButton
                onClick={() => handleAddBuildpack(buildpack.buildpack)}
              >
                <span className="material-icons-outlined">add</span>
              </DeleteButton>
            )}
            {action === "remove" && (
              <DeleteButton
                onClick={() => handleRemoveBuildpack(buildpack.buildpack)}
              >
                <span className="material-icons">delete</span>
              </DeleteButton>
            )}
          </ActionContainer>
        </StyledCard>
      );
    });
  };

  const handleRemoveBuildpack = (buildpackToRemove: string) => {
    setSelectedBuildpacks((selBuildpacks) => {
      const tmpSelectedBuildpacks = [...selBuildpacks];

      const indexBuildpackToRemove = tmpSelectedBuildpacks.findIndex(
        (buildpack) => buildpack.buildpack === buildpackToRemove
      );
      const buildpack = tmpSelectedBuildpacks[indexBuildpackToRemove];

      setAvailableBuildpacks((availableBuildpacks) => [
        ...availableBuildpacks,
        buildpack,
      ]);

      tmpSelectedBuildpacks.splice(indexBuildpackToRemove, 1);

      return [...tmpSelectedBuildpacks];
    });
  };

  const handleAddBuildpack = (buildpackToAdd: string) => {
    setAvailableBuildpacks((avBuildpacks) => {
      const tmpAvailableBuildpacks = [...avBuildpacks];
      const indexBuildpackToAdd = tmpAvailableBuildpacks.findIndex(
        (buildpack) => buildpack.buildpack === buildpackToAdd
      );
      const buildpack = tmpAvailableBuildpacks[indexBuildpackToAdd];

      setSelectedBuildpacks((selectedBuildpacks) => [
        ...selectedBuildpacks,
        buildpack,
      ]);

      tmpAvailableBuildpacks.splice(indexBuildpackToAdd, 1);
      return [...tmpAvailableBuildpacks];
    });
  };

  if (!stackOptions?.length || !builderOptions?.length) {
    return <Loading />;
  }

  return (
    <BuildpackConfigurationContainer>
      <>
        <SelectRow
          value={selectedBuilder}
          width="100%"
          options={builderOptions}
          setActiveValue={(option) => handleSelectBuilder(option)}
          label="Select a builder"
        />

        <SelectRow
          value={selectedStack}
          width="100%"
          options={stackOptions}
          setActiveValue={(option) => setSelectedStack(option)}
          label="Select your stack"
        />
        <Helper>
          The following buildpacks were automatically detected. You can also
          manually add/remove buildpacks.
        </Helper>

        {!!selectedBuildpacks?.length &&
          renderBuildpacksList(selectedBuildpacks, "remove")}

        {!!availableBuildpacks?.length && (
          <>
            <Helper>Available buildpacks:</Helper>
            {renderBuildpacksList(availableBuildpacks, "add")}
          </>
        )}
      </>
    </BuildpackConfigurationContainer>
  );
};

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const SaveButtonWrapper = styled.div`
  width: 100%;
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
`;

const Wrapper = styled.div`
  width: 100%;
  padding-bottom: 65px;
  height: 100%;
`;

const StyledSettingsSection = styled.div`
  width: 100%;
  background: #ffffff11;
  padding: 0 35px;
  padding-top: 35px;
  padding-bottom: 15px;
  position: relative;
  border-radius: 8px;
  height: calc(100% - 55px);
`;

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ffffff00;
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 8px;
  padding: 14px;
  overflow: hidden;
  height: 60px;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
`;

const Icon = styled.span`
  font-size: 20px;
  margin-left: 10px;
  margin-right: 20px;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const DeleteButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
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
