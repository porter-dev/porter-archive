import { DeviconsNameList } from "assets/devicons-name-list";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import SelectRow from "components/form-components/SelectRow";
import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ActionConfigType } from "shared/types";
import styled, { keyframes } from "styled-components";

const DEFAULT_BUILDER_NAME = "heroku";
const DEFAULT_PAKETO_STACK = "paketobuildpacks/builder:full";
const DEFAULT_HEROKU_STACK = "heroku/buildpacks:20";

type BuildConfig = {
  builder: string;
  buildpacks: string[];
  config: null | {
    [key: string]: string;
  };
};

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

export const BuildpackSelection: React.FC<{
  actionConfig: ActionConfigType;
  folderPath: string;
  branch: string;
  hide: boolean;
  onChange: (config: BuildConfig) => void;
}> = ({ actionConfig, folderPath, branch, hide, onChange }) => {
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
    let buildConfig: BuildConfig = {} as BuildConfig;

    buildConfig.builder = selectedStack;
    buildConfig.buildpacks = selectedBuildpacks?.map((buildpack) => {
      return buildpack.buildpack;
    });
    if (typeof onChange === "function") {
      onChange(buildConfig);
    }
  }, [selectedBuilder, selectedStack, selectedBuildpacks]);

  useEffect(() => {
    api
      .detectBuildpack<DetectBuildpackResponse>(
        "<token>",
        {
          dir: folderPath || ".",
        },
        {
          project_id: currentProject.id,
          git_repo_id: actionConfig.git_repo_id,
          kind: "github",
          owner: actionConfig.git_repo.split("/")[0],
          name: actionConfig.git_repo.split("/")[1],
          branch: branch,
        }
      )
      // getMockData()
      .then(({ data }) => {
        const builders = data;

        const defaultBuilder = builders.find(
          (builder) => builder.name.toLowerCase() === DEFAULT_BUILDER_NAME
        );

        const detectedBuildpacks = defaultBuilder.detected;
        const availableBuildpacks = defaultBuilder.others;
        const defaultStack = defaultBuilder.builders.find((stack) => {
          return (
            stack === DEFAULT_HEROKU_STACK || stack === DEFAULT_PAKETO_STACK
          );
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
  }, [currentProject, actionConfig]);

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
        <StyledCard key={buildpack.name}>
          <ContentContainer>
            <Icon disableMarginRight={disableIcon} className={icon} />
            <EventInformation>
              <EventName>{buildpack?.name}</EventName>
            </EventInformation>
          </ContentContainer>
          <ActionContainer>
            {action === "add" && (
              <ActionButton
                onClick={() => handleAddBuildpack(buildpack.buildpack)}
              >
                <span className="material-icons-outlined">add</span>
              </ActionButton>
            )}
            {action === "remove" && (
              <ActionButton
                onClick={() => handleRemoveBuildpack(buildpack.buildpack)}
              >
                <span className="material-icons">delete</span>
              </ActionButton>
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

  const handleAddCustomBuildpack = (buildpack: Buildpack) => {
    setSelectedBuildpacks((selectedBuildpacks) => [
      ...selectedBuildpacks,
      buildpack,
    ]);
  };

  if (hide) {
    return null;
  }

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

        <Helper>Available buildpacks:</Helper>
        {!!availableBuildpacks?.length && (
          <>{renderBuildpacksList(availableBuildpacks, "add")}</>
        )}
        <Helper>
          You may also add buildpacks by directly providing their GitHub links
          or links to ZIP files that contain the buildpack source code.
        </Helper>
        <AddCustomBuildpackForm onAdd={handleAddCustomBuildpack} />
      </>
    </BuildpackConfigurationContainer>
  );
};

export const AddCustomBuildpackForm: React.FC<{
  onAdd: (buildpack: Buildpack) => void;
}> = ({ onAdd }) => {
  const [buildpackUrl, setBuildpackUrl] = useState("");
  const [error, setError] = useState(false);

  const handleAddCustomBuildpack = () => {
    const buildpack: Buildpack = {
      buildpack: buildpackUrl,
      name: buildpackUrl,
      config: null,
    };
    setBuildpackUrl("");
    onAdd(buildpack);
  };

  return (
    <StyledCard>
      <ContentContainer>
        <EventInformation>
          <BuildpackInputContainer>
            GitHub or ZIP URL
            <BuildpackUrlInput
              placeholder="https://github.com/custom/buildpack"
              type="input"
              value={buildpackUrl}
              isRequired
              setValue={(newUrl) => {
                setError(false);
                setBuildpackUrl(newUrl as string);
              }}
            />
            <ErrorText hasError={error}>Please enter a valid url</ErrorText>
          </BuildpackInputContainer>
        </EventInformation>
      </ContentContainer>
      <ActionContainer>
        <ActionButton onClick={() => handleAddCustomBuildpack()}>
          <span className="material-icons-outlined">add</span>
        </ActionButton>
      </ActionContainer>
    </StyledCard>
  );
};

const ErrorText = styled.span`
  color: red;
  margin-left: 10px;
  display: ${(props: { hasError: boolean }) =>
    props.hasError ? "inline-block" : "none"};
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const BuildpackUrlInput = styled(InputRow)`
  width: auto;
  min-width: 150px;
  max-width: 300px;
  margin: unset;
  margin-left: 10px;
  display: inline-block;
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
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

const BuildpackInputContainer = styled(EventName)`
  padding-left: 15px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled.button`
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
