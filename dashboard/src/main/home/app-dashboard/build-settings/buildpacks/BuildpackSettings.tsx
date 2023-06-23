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
import Error from "components/porter/Error";
import { PorterApp } from "../../types/porterApp";
import AddCustomBuildpackComponent from "./AddCustomBuildpackComponent";
import BuildpackList from "./BuildpackList";
import Icon from "components/porter/Icon";
import stars from "assets/stars-white.svg";

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

const BUILDPACK_TO_NAME: { [key: string]: string } = {
  "heroku/nodejs": "NodeJS",
  "heroku/python": "Python",
  "heroku/java": "Java",
  "heroku/ruby": "Ruby",
  "heroku/go": "Go",
};

const BuildpackSettings: React.FC<{
  porterApp: PorterApp;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  autoDetectBuildpacks: boolean;
}> = ({
  porterApp,
  updatePorterApp,
  autoDetectBuildpacks,
}) => {
    const { currentProject } = useContext(Context);

    const [builders, setBuilders] = useState<DetectedBuildpack[]>([]);
    const [selectedStack, setSelectedStack] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetectingBuildpacks, setIsDetectingBuildpacks] = useState(false);
    const [error, setError] = useState<string>("");

    const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>([]);
    const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>([]);
    const renderModalContent = () => {
      return (
        <>
          <Text size={16}>Buildpack Configuration</Text>
          <Spacer y={1} />
          <Scrollable>
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
            <Spacer y={0.5} />
            <BuildpackList
              selectedBuildpacks={selectedBuildpacks}
              setSelectedBuildpacks={setSelectedBuildpacks}
              availableBuildpacks={availableBuildpacks}
              setAvailableBuildpacks={setAvailableBuildpacks}
              porterApp={porterApp}
              updatePorterApp={updatePorterApp}
              showAvailableBuildpacks={true}
              isDetectingBuildpacks={isDetectingBuildpacks}
              detectBuildpacksError={error}
              droppableId={"modal"}
            />
            <Spacer y={0.5} />
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
            <FooterButtons>
              <Button onClick={() => detectAndSetBuildPacks(true)}>
                <Icon src={stars} height="15px" />
                <Spacer inline x={0.5} />
                Detect buildpacks
              </Button>
              <Button onClick={() => setIsModalOpen(false)} width={"75px"}>Save</Button>
            </FooterButtons>
          </Footer>
        </>
      );
    };
    const detectAndSetBuildPacks = async (detect: boolean) => {
      try {
        if (currentProject == null) {
          return;
        }

        if (!detect) {
          // in this case, we are not detecting buildpacks, so we just populate based on the DB
          setBuilders([{
            name: porterApp.builder.split("/")[0],
            builders: [porterApp.builder],
            detected: [],
            others: [],
            buildConfig: {} as BuildConfig,
          }])
          setSelectedStack(porterApp.builder);
          setSelectedBuildpacks(porterApp.buildpacks?.map(bp => ({
            name: BUILDPACK_TO_NAME[bp] ?? bp,
            buildpack: bp,
            config: {},
          })) ?? []);
          setAvailableBuildpacks([]);
        } else {
          if (isDetectingBuildpacks) {
            return;
          }
          setIsDetectingBuildpacks(true);
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

          const allBuildpacks = defaultBuilder.others.concat(defaultBuilder.detected);

          let detectedBuilder: string;
          if (defaultBuilder.builders.length && defaultBuilder.builders.includes(DEFAULT_HEROKU_STACK)) {
            setSelectedStack(DEFAULT_HEROKU_STACK);
            detectedBuilder = DEFAULT_HEROKU_STACK;
          } else {
            setSelectedStack(defaultBuilder.builders[0]);
            detectedBuilder = defaultBuilder.builders[0];
          }

          const newBuildpacks = defaultBuilder.detected.filter(bp => !porterApp.buildpacks.includes(bp.buildpack));
          if (autoDetectBuildpacks) {
            updatePorterApp({ builder: detectedBuilder, buildpacks: [...porterApp.buildpacks, ...newBuildpacks.map(bp => bp.buildpack)] });
            setSelectedBuildpacks(defaultBuilder.detected);
            setAvailableBuildpacks(defaultBuilder.others);
            setError("");
          } else {
            setAvailableBuildpacks(allBuildpacks.filter(bp => !porterApp.buildpacks?.includes(bp.buildpack)));
          }
        }
      } catch (err) {
        if (autoDetectBuildpacks) {
          updatePorterApp({ buildpacks: [] });
          setSelectedBuildpacks([]);
          setAvailableBuildpacks([]);
          setError(`Unable to detect buildpacks at path: ${porterApp.build_context}. Please make sure your repo, branch, and application root path are all set correctly and attempt to detect again.`);
        }
      } finally {
        setIsDetectingBuildpacks(false);
      }
    }

    useEffect(() => {
      detectAndSetBuildPacks(autoDetectBuildpacks);
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

    const handleAddCustomBuildpack = (buildpack: Buildpack) => {
      if (porterApp.buildpacks.find((bp) => bp === buildpack.buildpack) == null) {
        updatePorterApp({ buildpacks: [...porterApp.buildpacks, buildpack.buildpack] });
        setSelectedBuildpacks([...selectedBuildpacks, buildpack]);
      }
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
        {selectedBuildpacks.length > 0 && (
          <>
            <Helper>
              The following buildpacks were automatically detected. You can also
              manually add, remove, or re-order buildpacks here.
            </Helper>
            <BuildpackList
              selectedBuildpacks={selectedBuildpacks}
              setSelectedBuildpacks={setSelectedBuildpacks}
              availableBuildpacks={availableBuildpacks}
              setAvailableBuildpacks={setAvailableBuildpacks}
              porterApp={porterApp}
              updatePorterApp={updatePorterApp}
              showAvailableBuildpacks={false}
              isDetectingBuildpacks={isDetectingBuildpacks}
              detectBuildpacksError={error}
              droppableId={"non-modal"}
            />
          </>
        )}
        {autoDetectBuildpacks && error !== "" && (
          <>
            <Spacer y={1} />
            <Error message={error} />
          </>
        )}
        <Spacer y={1} />
        <Button onClick={() => {
          setIsModalOpen(true);
          setError("");
        }}>
          <I className="material-icons">add</I> Add / detect buildpacks
        </Button>
        {isModalOpen && (
          <Modal closeModal={() => setIsModalOpen(false)}>
            {renderModalContent()}
          </Modal>
        )}
      </BuildpackConfigurationContainer>
    );
  };

export default BuildpackSettings;


const Shade = styled.div`
  position: absolute;
  top: -50px;
  left: 0;
  height: 50px;
  width: 100%;
  background: linear-gradient(to bottom, #00000000, ${({ theme }) => theme.fg});
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: space-between;
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
