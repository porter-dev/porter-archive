import { DeviconsNameList } from "assets/devicons-name-list";
import Helper from "components/form-components/Helper";
import InputRow from "components/form-components/InputRow";
import Select from "components/porter/Select";
import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ActionConfigType } from "shared/types";
import styled, { keyframes } from "styled-components";
// Add the following imports
import { Button as MuiButton, Modal as MuiModal } from "@material-ui/core";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

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
  buildConfig: BuildConfig;
};

type DetectBuildpackResponse = DetectedBuildpack[];

export const BuildpackStack: React.FC<{
  actionConfig: ActionConfigType;
  folderPath: string;
  branch: string;
  hide: boolean;
  onChange: (config: BuildConfig) => void;
  currentBuildConfig?: BuildConfig;
  setBuildConfig?: (config: BuildConfig) => void;
}> = ({
  actionConfig,
  folderPath,
  branch,
  hide,
  onChange,
  currentBuildConfig,
  setBuildConfig,
}) => {
  const { currentProject } = useContext(Context);

  const [builders, setBuilders] = useState<DetectedBuildpack[]>(null);

  const [stacks, setStacks] = useState<string[]>(null);
  const [selectedStack, setSelectedStack] = useState<string>(
    currentBuildConfig?.builder || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>([]);
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    []
  );
  const renderModalContent = () => {
    return (
      <>
        <Text size={16}>Buildpack Configuration</Text>
        <Spacer y={1} />
        <Scrollable>
          <Text color="helper">Selected buildpacks:</Text>
          <Spacer y={1} />
          {!!selectedBuildpacks?.length &&
            renderBuildpacksList(selectedBuildpacks, "remove")}

          <Spacer y={1} />
          {!!availableBuildpacks?.length && (
            <>
              <Text color="helper">Available buildpacks:</Text>
              <Spacer y={1} />
              <>{renderBuildpacksList(availableBuildpacks, "add")}</>
            </>
          )}
          <Spacer y={1} />
          <Text color="helper">
            You may also add buildpacks by directly providing their GitHub links
            or links to ZIP files that contain the buildpack source code.
          </Text>
          <Spacer y={1} />
          <AddCustomBuildpackForm onAdd={handleAddCustomBuildpack} />
          <Spacer y={2} />
        </Scrollable>
        <Footer>
          <Shade />
          <Spacer y={1} />
          <Button onClick={() => setIsModalOpen(false)}>Save buildpacks</Button>
        </Footer>
      </>
    );
  };
  useEffect(() => {
    let buildConfig: BuildConfig = {} as BuildConfig;
    buildConfig.builder = selectedStack;
    buildConfig.buildpacks = selectedBuildpacks?.map((buildpack) => {
      return buildpack.buildpack;
    });

    if (typeof onChange === "function") {
      onChange(buildConfig);

      if (currentBuildConfig) {
        setBuildConfig(buildConfig);
      }
    }
  }, [selectedStack, selectedBuildpacks]);

  const detectBuildpack = () => {
    if (actionConfig.kind === "gitlab") {
      return api.detectGitlabBuildpack<DetectBuildpackResponse>(
        "<token>",
        { dir: folderPath || "." },
        {
          project_id: currentProject.id,
          integration_id: actionConfig.gitlab_integration_id,

          repo_owner: actionConfig.git_repo.split("/")[0],
          repo_name: actionConfig.git_repo.split("/")[1],
          branch: branch,
        }
      );
    }

    return api.detectBuildpack<DetectBuildpackResponse>(
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
    );
  };

  const classes = useStyles();

  useEffect(() => {
    detectBuildpack()
      // getMockData()
      .then(({ data }) => {
        const builders = data;

        const defaultBuilder = builders.find(
          (builder) => builder.name.toLowerCase() === DEFAULT_BUILDER_NAME
        );

        var detectedBuildpacks = defaultBuilder.detected;
        var availableBuildpacks = defaultBuilder.others;
        var defaultStack = "";
        if (currentBuildConfig && currentBuildConfig.buildpacks.length != 0) {
          if (!detectedBuildpacks) {
            detectedBuildpacks = [];
          }

          defaultStack = currentBuildConfig.builder;
          for (const buildpackName of currentBuildConfig.buildpacks) {
            const matchingBuildpackIndex = availableBuildpacks.findIndex(
              (buildpack) => buildpack.buildpack === buildpackName
            );

            if (matchingBuildpackIndex >= 0) {
              const matchingBuildpack = availableBuildpacks.splice(
                matchingBuildpackIndex,
                1
              )[0];
              const existingBuildpackIndex = detectedBuildpacks.findIndex(
                (buildpack) => buildpack.buildpack === buildpackName
              );
              if (existingBuildpackIndex < 0) {
                detectedBuildpacks.push(matchingBuildpack);
              }
            } else {
              const newBuildpack: Buildpack = {
                name: buildpackName,
                buildpack: buildpackName,
                config: null,
              };
              const existingBuildpackIndex = detectedBuildpacks.findIndex(
                (buildpack) => buildpack.buildpack === buildpackName
              );
              if (existingBuildpackIndex < 0) {
                detectedBuildpacks.push(newBuildpack);
              }
            }
          }
        } else {
          detectedBuildpacks = defaultBuilder.detected;
          availableBuildpacks = defaultBuilder.others;
          defaultStack = builders
            .flatMap((builder) => builder.builders)
            .find((stack) => {
              return (
                stack === DEFAULT_HEROKU_STACK || stack === DEFAULT_PAKETO_STACK
              );
            });
        }
        setBuilders(builders);
        setSelectedStack(defaultStack);

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
    if (!Array.isArray(builders)) {
      return;
    }

    return builders.flatMap((builder) => {
      return builder.builders.map((stack) => ({
        label: `${builder.name} - ${stack}`,
        value: stack.toLowerCase(),
      }));
    });
  }, [builders]);
  //   const builder = builders.find(
  //     (b) => b.name.toLowerCase() === builderName.toLowerCase()
  //   );
  //   const detectedBuildpacks = builder.detected;
  //   const availableBuildpacks = builder.others;
  //   const defaultStack = builder.builders.find((stack) => {
  //     return stack === DEFAULT_HEROKU_STACK || stack === DEFAULT_PAKETO_STACK;
  //   });
  //   setSelectedBuilder(builderName);
  //   setBuilders(builders);
  //   setSelectedBuilder(builderName.toLowerCase());

  //   setStacks(builder.builders);
  //   setSelectedStack(defaultStack);

  //   if (!Array.isArray(detectedBuildpacks)) {
  //     setSelectedBuildpacks([]);
  //   } else {
  //     setSelectedBuildpacks(detectedBuildpacks);
  //   }
  //   if (!Array.isArray(availableBuildpacks)) {
  //     setAvailableBuildpacks([]);
  //   } else {
  //     setAvailableBuildpacks(availableBuildpacks);
  //   }
  // };

  const renderBuildpacksList = (
    buildpacks: Buildpack[],
    action: "remove" | "add",
    isLast: boolean = false
  ) => {
    return buildpacks?.map((buildpack, index) => {
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
        <StyledCard key={buildpack.name} marginBottom="5px">
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
        <Select
          value={selectedStack}
          width="300px"
          options={stackOptions}
          setValue={(option) => {
            setSelectedStack(option);
          }}
          label="Builder and stack"
        />
        {!!selectedBuildpacks?.length && (
          <Helper>
            The following buildpacks were automatically detected. You can also
            manually add/remove buildpacks.
          </Helper>
        )}
        {!!selectedBuildpacks?.length && (
          <>{renderBuildpacksList(selectedBuildpacks, "remove")}</>
        )}
        <Spacer y={1} />
        <Button onClick={() => setIsModalOpen(true)}>
          <I className="material-icons">add</I> Add buildpack
        </Button>
        {isModalOpen && (
          <Modal closeModal={() => setIsModalOpen(false)}>
            {renderModalContent()}
          </Modal>
        )}
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
    <StyledCard marginBottom="0px">
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

const Shade = styled.div`
  position: absolute;
  top: -50px;
  left: 0;
  height: 50px;
  width: 100%;
  background: linear-gradient(to bottom, #00000000, ${({ theme }) => theme.fg});
`;

const Footer = styled.div`
  position: relative;
  width: calc(100% + 50px);
  margin-left: -25px;
  padding: 0 25px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background: ${({ theme }) => theme.fg};
  margin-bottom: -30px;
  padding-bottom: 30px;
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const ErrorText = styled.span`
  color: red;
  margin-left: 10px;
  display: ${(props: { hasError: boolean }) =>
    props.hasError ? "inline-block" : "none"};
`;

const Scrollable = styled.div`
  overflow-y: auto;
  padding: 0 25px;
  width: calc(100% + 50px);
  margin-left: -25px;
  max-height: calc(100vh - 300px);
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
  min-width: 300px;
  max-width: 600px;
  margin: unset;
  margin-left: 10px;
  display: inline-block;
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
`;

const StyledCard = styled.div<{ marginBottom?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #494b4f;
  background: ${({ theme }) => theme.fg};
  margin-bottom: ${(props) => props.marginBottom || "30px"};
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

const SaveButton = withStyles({
  root: {
    backgroundColor: "#8590ff",
    color: "white",
    marginTop: "24px",
    position: "absolute",
    bottom: "16px",
    right: "16px",
  },
})(MuiButton);

const StyledModal = withStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
})(MuiModal);
const useStyles = makeStyles((theme) => ({
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));
