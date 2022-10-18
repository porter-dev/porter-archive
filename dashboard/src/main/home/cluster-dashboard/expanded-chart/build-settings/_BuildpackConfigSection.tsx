import { DeviconsNameList } from "assets/devicons-name-list";
import Helper from "components/form-components/Helper";
import SelectRow from "components/form-components/SelectRow";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import { AddCustomBuildpackForm } from "components/repo-selector/BuildpackSelection";
import { differenceBy } from "lodash";
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
import { Buildpack, DetectBuildpackResponse, DetectedBuildpack } from "./types";

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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

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

    setIsLoading(true);

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
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentProject, actionConfig, currentChart]);

  useImperativeHandle(
    ref,
    () => {
      return {
        isLoading: isLoading,
        getBuildConfig: () => {
          const currentBuildConfig = currentChart?.build_config;

          if (error) {
            if (typeof currentBuildConfig.config === "string") {
              return {
                ...currentBuildConfig,
                config: JSON.parse(atob(currentBuildConfig.config)) as Record<
                  string,
                  unknown
                >,
              } as BuildConfig;
            } else {
              return currentBuildConfig;
            }
          }

          let buildConfig: BuildConfig = {} as BuildConfig;

          buildConfig.builder = selectedStack;
          buildConfig.buildpacks = selectedBuildpacks?.map((buildpack) => {
            return buildpack.buildpack;
          });

          return buildConfig;
        },
      };
    },
    [selectedBuilder, selectedBuildpacks, selectedStack, isLoading, error]
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

  if (isLoading) {
    return (
      <div style={{ marginTop: "20px" }}>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: "20px" }}>
        <Placeholder>
          <div>
            <h2>Couldn't retrieve buildpacks.</h2>
            <p>
              Check if the branch exists and the Porter App has enough
              permissions on the repository.
            </p>
          </div>
        </Placeholder>
      </div>
    );
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

BuildpackConfigSection.displayName = "BuildpackConfigSection";

export default BuildpackConfigSection;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
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
