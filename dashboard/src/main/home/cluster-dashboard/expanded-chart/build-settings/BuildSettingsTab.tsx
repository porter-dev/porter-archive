import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import KeyValueArray from "components/form-components/KeyValueArray";
import SelectRow from "components/form-components/SelectRow";
import Loading from "components/Loading";
import MultiSaveButton from "components/MultiSaveButton";
import _, { differenceBy, unionBy } from "lodash";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { AddCustomBuildpackForm } from "components/repo-selector/BuildpackSelection";
import { DeviconsNameList } from "assets/devicons-name-list";
import Selector from "components/Selector";
import BranchList from "components/repo-selector/BranchList";
import Banner from "components/Banner";

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
        <Banner type="warning">
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

const BuildpackConfigSection = forwardRef<
  {
    isLoading: boolean;
    getBuildConfig: () => BuildConfig;
  },
  {
    actionConfig: FullActionConfigType;
    currentChart: ChartTypeWithExtendedConfig;
  }
>(({ actionConfig, currentChart }, ref) => {
  const { currentProject } = useContext(Context);

  const [builders, setBuilders] = useState<DetectedBuildpack[]>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<string>(null);

  const [stacks, setStacks] = useState<string[]>(null);
  const [selectedStack, setSelectedStack] = useState<string>(null);

  const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>([]);
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    []
  );

  const state = useRef<null | {
    [builder: string]: {
      stack: string;
      selectedBuildpacks: Buildpack[];
      availableBuildpacks: Buildpack[];
    };
  }>(null);

  const populateState = (
    builder: string,
    stack: string,
    availableBuildpacks: Buildpack[] = [],
    selectedBuildpacks: Buildpack[] = []
  ) => {
    state.current = {
      ...state.current,
      [builder]: {
        stack: stack,
        availableBuildpacks: availableBuildpacks,
        selectedBuildpacks: selectedBuildpacks,
      },
    };
  };

  const populateBuildpacks = (
    userBuildpacks: string[],
    detectedBuildpacks: Buildpack[]
  ) => {
    const customBuildpackFactory = (name: string): Buildpack => ({
      name: name,
      buildpack: name,
      config: null,
    });

    return userBuildpacks.map(
      (ub) =>
        detectedBuildpacks.find((db) => db.buildpack === ub) ||
        customBuildpackFactory(ub)
    );
  };

  const detectBuildpack = () => {
    if (actionConfig.kind === "gitlab") {
      return api.detectGitlabBuildpack<DetectBuildpackResponse>(
        "<token>",
        { dir: actionConfig.folder_path || "." },
        {
          project_id: currentProject.id,
          integration_id: actionConfig.gitlab_integration_id,

          repo_owner: actionConfig.git_repo.split("/")[0],
          repo_name: actionConfig.git_repo.split("/")[1],
          branch: actionConfig.git_branch,
        }
      );
    }

    return api.detectBuildpack<DetectBuildpackResponse>(
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
    );
  };

  useEffect(() => {
    const currentBuildConfig = currentChart?.build_config;

    if (!currentBuildConfig) {
      return;
    }
    detectBuildpack()
      .then(({ data }) => {
        const builders = data;

        const defaultBuilder = builders.find((builder) =>
          builder.builders.find((stack) => stack === currentBuildConfig.builder)
        );

        const nonSelectedBuilder = builders.find(
          (builder) =>
            !builder.builders.find(
              (stack) => stack === currentBuildConfig.builder
            )
        );

        const fullDetectedBuildpacks = [
          ...defaultBuilder.detected,
          ...defaultBuilder.others,
        ];

        const userSelectedBuildpacks = populateBuildpacks(
          currentBuildConfig.buildpacks,
          fullDetectedBuildpacks
        ).filter((b) => b.buildpack);

        const availableBuildpacks = differenceBy(
          fullDetectedBuildpacks,
          userSelectedBuildpacks,
          "buildpack"
        );

        const defaultStack = defaultBuilder.builders.find((stack) => {
          return stack === currentBuildConfig.builder;
        });

        populateState(
          defaultBuilder.name.toLowerCase(),
          defaultStack,
          userSelectedBuildpacks,
          availableBuildpacks
        );

        populateState(
          nonSelectedBuilder.name.toLowerCase(),
          nonSelectedBuilder.builders[0],
          nonSelectedBuilder.others,
          nonSelectedBuilder.detected
        );

        setBuilders(builders);
        setSelectedBuilder(defaultBuilder.name.toLowerCase());

        setStacks(defaultBuilder.builders);
        setSelectedStack(defaultStack);
        if (!Array.isArray(userSelectedBuildpacks)) {
          setSelectedBuildpacks([]);
        } else {
          setSelectedBuildpacks(userSelectedBuildpacks);
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

  useImperativeHandle(
    ref,
    () => {
      const isLoading = !stackOptions?.length || !builderOptions?.length;
      return {
        isLoading,
        getBuildConfig: () => {
          let buildConfig: BuildConfig = {} as BuildConfig;

          buildConfig.builder = selectedStack;
          buildConfig.buildpacks = selectedBuildpacks?.map((buildpack) => {
            return buildpack.buildpack;
          });
          return buildConfig;
        },
      };
    },
    [selectedBuilder, selectedBuildpacks, selectedStack]
  );

  useEffect(() => {
    populateState(
      selectedBuilder,
      selectedStack,
      availableBuildpacks,
      selectedBuildpacks
    );
  }, [selectedBuilder, selectedBuildpacks, selectedStack, availableBuildpacks]);

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

  const handleAddCustomBuildpack = (buildpack: Buildpack) => {
    setSelectedBuildpacks((selectedBuildpacks) => [
      ...selectedBuildpacks,
      buildpack,
    ]);
  };

  const handleSelectBuilder = (builderName: string) => {
    const builder = builders.find(
      (b) => b.name.toLowerCase() === builderName.toLowerCase()
    );

    setBuilders(builders);
    setStacks(builder.builders);

    const currState = state.current;
    if (currState[builderName]) {
      const stateBuilder = currState[builderName];
      setSelectedBuilder(builderName);
      setSelectedStack(stateBuilder.stack);
      setAvailableBuildpacks(stateBuilder.availableBuildpacks);
      setSelectedBuildpacks(stateBuilder.selectedBuildpacks);
      return;
    }
  };

  const renderBuildpacksList = (
    buildpacks: Buildpack[],
    action: "remove" | "add"
  ) => {
    if (!buildpacks.length && action === "remove") {
      return (
        <StyledCard>Buildpacks will be automatically detected.</StyledCard>
      );
    }

    if (!buildpacks.length && action === "add") {
      return (
        <StyledCard>
          No additional buildpacks are available. You can add a custom buildpack
          below.
        </StyledCard>
      );
    }

    return buildpacks?.map((buildpack, i) => {
      const [languageName] = buildpack.name?.split("/").reverse();

      const devicon = DeviconsNameList.find(
        (devicon) => languageName.toLowerCase() === devicon.name
      );

      const icon = `devicon-${devicon?.name}-plain colored`;

      let disableIcon = false;
      if (!devicon) {
        disableIcon = true;
      }

      return (
        <StyledCard key={i}>
          <ContentContainer>
            <Icon disableMarginRight={disableIcon} className={icon} />
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
        <>{renderBuildpacksList(selectedBuildpacks, "remove")}</>
        <Helper>Available buildpacks:</Helper>
        <>{renderBuildpacksList(availableBuildpacks, "add")}</>
        <Helper>
          You may also add buildpacks by directly providing their GitHub links
          or links to ZIP files that contain the buildpack source code.
        </Helper>
        <AddCustomBuildpackForm onAdd={handleAddCustomBuildpack} />
      </>
    </BuildpackConfigurationContainer>
  );
});

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

const Icon = styled.span<{ disableMarginRight: boolean }>`
  font-size: 20px;
  margin-left: 10px;
  ${(props) => {
    if (!props.disableMarginRight) {
      return "margin-right: 20px";
    }
  }}
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
