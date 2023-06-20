import { DeviconsNameList } from "assets/devicons-name-list";
import Helper from "components/form-components/Helper";
import Select from "components/porter/Select";
import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled, { keyframes } from "styled-components";
import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterApp } from "../types/porterApp";
import AddCustomBuildpackComponent from "./AddCustomBuildpackComponent";

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

export type Buildpack = {
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

const BuildpackStack: React.FC<{
  porterApp: PorterApp;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
}> = ({
  porterApp,
  updatePorterApp,
}) => {
    const { currentProject } = useContext(Context);

    const [builders, setBuilders] = useState<DetectedBuildpack[]>([]);
    const [selectedStack, setSelectedStack] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>([]);
    const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>([]);
    const renderModalContent = () => {
      return (
        <>
          <Text size={16}>Buildpack Configuration</Text>
          <Spacer y={1} />
          <Scrollable>
            <Text color="helper">Selected buildpacks:</Text>
            <Spacer y={1} />
            {selectedBuildpacks.length &&
              renderBuildpacksList(selectedBuildpacks, "remove")}

            <Spacer y={1} />
            {availableBuildpacks.length && (
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
            <AddCustomBuildpackComponent onAdd={handleAddCustomBuildpack} />
            <Spacer y={2} />
          </Scrollable>
          <Footer>
            <Shade />
            <Button onClick={() => setIsModalOpen(false)}>Save buildpacks</Button>
          </Footer>
        </>
      );
    };

    useEffect(() => {
      const detectAndSetBuildPacks = async () => {
        try {
          if (currentProject == null) {
            return;
          }
          const detectBuildPackRes = await api.detectBuildpack(
            "<token>",
            {
              dir: porterApp.build_context || ".",
            },
            {
              project_id: currentProject.id,
              git_repo_id: porterApp.git_repo_id,
              kind: "github",
              owner: porterApp.repo_name.split("/")[0],
              name: porterApp.repo_name.split("/")[1],
              branch: porterApp.git_branch,
            }
          );

          const builders = detectBuildPackRes.data as DetectedBuildpack[];
          if (builders.length === 0) {
            return;
          }

          setBuilders(builders);

          const defaultBuilder = builders.find(
            (builder) => builder.name.toLowerCase() === DEFAULT_BUILDER_NAME
          ) ?? builders[0];

          setSelectedBuildpacks(defaultBuilder.detected);
          setAvailableBuildpacks(defaultBuilder.others);

          let detectedBuilder: string;
          if (defaultBuilder.builders.length && defaultBuilder.builders.includes(DEFAULT_HEROKU_STACK)) {
            setSelectedStack(DEFAULT_HEROKU_STACK);
            detectedBuilder = DEFAULT_HEROKU_STACK;
          } else {
            setSelectedStack(defaultBuilder.builders[0]);
            detectedBuilder = defaultBuilder.builders[0];
          }

          // update the builder and the buildpacks
          const newBuildpacks = defaultBuilder.detected.filter(bp => !porterApp.buildpacks.includes(bp.buildpack));
          updatePorterApp({ builder: detectedBuilder, buildpacks: [...porterApp.buildpacks, ...newBuildpacks.map(bp => bp.buildpack)] });
        } catch (err) {
          console.log(err);
        };
      }
      detectAndSetBuildPacks();
    }, [currentProject]);

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


        const index = porterApp.buildpacks.indexOf(buildpackToRemove);
        if (index > -1) {
          updatePorterApp({ buildpacks: porterApp.buildpacks.splice(index, 1) });
        }

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

        if (porterApp.buildpacks.find((bp) => bp === buildpackToAdd) == null) {
          updatePorterApp({ buildpacks: [...porterApp.buildpacks, buildpackToAdd] });
        }
        tmpAvailableBuildpacks.splice(indexBuildpackToAdd, 1);
        return [...tmpAvailableBuildpacks];
      });
    };

    const handleAddCustomBuildpack = (buildpack: Buildpack) => {
      if (porterApp.buildpacks.find((bp) => bp === buildpack.buildpack) == null) {
        updatePorterApp({ buildpacks: [...porterApp.buildpacks, buildpack.buildpack] });
      }
      setSelectedBuildpacks((selectedBuildpacks) => [
        ...selectedBuildpacks,
        buildpack,
      ]);
    };

    if (!stackOptions?.length || !builderOptions?.length) {
      return <Loading />;
    }

    const sortedStackOptions = stackOptions.sort((a, b) => {
      if (a.label < b.label) {
        return -1;
      }
      if (a.label > b.label) {
        return 1;
      }
      return 0;
    });

    return (
      <BuildpackConfigurationContainer>
        <>
          <Select
            value={selectedStack}
            width="300px"
            options={sortedStackOptions}
            setValue={(option) => {
              setSelectedStack(option);
              updatePorterApp({ builder: option });
            }}
            label="Builder and stack"
          />
          {selectedBuildpacks.length && (
            <Helper>
              The following buildpacks were automatically detected. You can also
              manually add/remove buildpacks.
            </Helper>
          )}
          {selectedBuildpacks.length && (
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

export default BuildpackStack;


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
