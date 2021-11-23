import React, {
  Component,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled, { keyframes } from "styled-components";

import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import api from "shared/api";
import Loading from "components/Loading";
import { ActionConfigType } from "../../shared/types";
import InputRow from "../form-components/InputRow";
import Selector from "components/Selector";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type PropsType = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  branch: string;
  dockerfilePath: string;
  procfilePath: string;
  setProcfilePath: (x: string) => void;
  setProcfileProcess: (x: string) => void;
  folderPath: string;
  setSelectedRegistry: (x: any) => void;
  selectedRegistry: any;
  setDockerfilePath: (x: string) => void;
  setFolderPath: (x: string) => void;
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

const ActionDetails: React.FC<PropsType> = (props) => {
  const {
    actionConfig,
    branch,
    dockerfilePath,
    folderPath,
    procfilePath,
    selectedRegistry,
    setActionConfig,
    setDockerfilePath,
    setFolderPath,
    setProcfilePath,
    setProcfileProcess,
    setSelectedRegistry,
  } = props;

  const { currentProject } = useContext(Context);
  const [registries, setRegistries] = useState<any[]>(null);
  const [loading, setLoading] = useState(true);
  const [buildersOptions, setBuildersOptions] = useState<[]>(null);
  const [currentBuilder, setCurrentBuilder] = useState(null);
  const [availableBuildpacks, setAvailableBuildpacks] = useState(null);
  const [availableStacks, setAvailableStacks] = useState(null);
  const [selectedStack, setSelectedStack] = useState(null);
  const [selectedBuildpacks, setSelectedBuildpacks] = useState(null);

  useEffect(() => {
    const project_id = currentProject.id;

    api
      .getProjectRegistries("<token>", {}, { id: project_id })
      .then((res: any) => {
        setRegistries(res.data);
        setLoading(false);
        if (res.data.length === 1) {
          setSelectedRegistry(res.data[0]);
        }
      })
      .catch((err: any) => console.log(err));
  }, [currentProject]);

  const renderIntegrationList = () => {
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }

    return registries.map((registry: any, i: number) => {
      let icon =
        integrationList[registry?.service] &&
        integrationList[registry?.service]?.icon;

      if (!icon) {
        icon = integrationList["dockerhub"]?.icon;
      }

      return (
        <RegistryItem
          key={i}
          isSelected={selectedRegistry && registry.id === selectedRegistry?.id}
          lastItem={i === registries?.length - 1}
          onClick={() => setSelectedRegistry(registry)}
        >
          <img src={icon && icon} />
          {registry.url}
        </RegistryItem>
      );
    });
  };

  const renderRegistrySection = () => {
    if (!registries || registries.length === 0 || registries.length === 1) {
      return;
    } else {
      return (
        <>
          <Subtitle>
            Select an Image Destination
            <Required>*</Required>
          </Subtitle>
          <ExpandedWrapper>{renderIntegrationList()}</ExpandedWrapper>
        </>
      );
    }
  };

  return (
    <>
      <DarkMatter />
      <InputRow
        disabled={true}
        label="Git Repository"
        type="text"
        width="100%"
        value={actionConfig?.git_repo}
      />
      <InputRow
        disabled={true}
        label="Branch"
        type="text"
        width="100%"
        value={props?.branch}
      />
      {dockerfilePath && (
        <InputRow
          disabled={true}
          label="Dockerfile Path"
          type="text"
          width="100%"
          value={dockerfilePath}
        />
      )}
      <InputRow
        disabled={true}
        label={dockerfilePath ? "Docker Build Context" : "Application Folder"}
        type="text"
        width="100%"
        value={folderPath}
      />
      {renderRegistrySection()}
      {!dockerfilePath && (
        <BuildpackSelection
          actionConfig={actionConfig}
          branch={branch}
          folderPath={folderPath}
          onChange={(config) => {}}
        />
      )}
      <Br />

      <Flex>
        <BackButton
          width="140px"
          onClick={() => {
            setDockerfilePath(null);
            setFolderPath(null);
            setProcfilePath(null);
            setProcfileProcess(null);
            setSelectedRegistry(null);
          }}
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Folder
        </BackButton>
        {selectedRegistry ? (
          <StatusWrapper successful={true}>
            <i className="material-icons">done</i> Source selected
          </StatusWrapper>
        ) : (
          <StatusWrapper>
            <i className="material-icons">error_outline</i>A connected container
            registry is required
          </StatusWrapper>
        )}
      </Flex>
    </>
  );
};

export default ActionDetails;

const DEFAULT_BUILDER_NAME = "paketo";
const DEFAULT_PAKETO_STACK = "paketobuildpacks/builder:full";
const DEFAULT_HEROKU_STACK = "heroku:20";

type BuildConfig = {
  builder: string;
  buildpacks: string[];
  config: null | {
    [key: string]: string;
  };
};

const BuildpackSelection: React.FC<{
  actionConfig: ActionConfigType;
  folderPath: string;
  branch: string;
  onChange: (config: BuildConfig) => void;
}> = ({ actionConfig, folderPath, branch }) => {
  const { currentProject } = useContext(Context);

  const [builders, setBuilders] = useState<DetectedBuildpack[]>(null);
  const [selectedBuilder, setSelectedBuilder] = useState<string>(null);

  const [stacks, setStacks] = useState<string[]>(null);
  const [selectedStack, setSelectedStack] = useState<string>(null);

  const [selectedBuildpacks, setSelectedBuildpacks] = useState<Buildpack[]>(
    null
  );
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    null
  );

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
        setSelectedBuilder(defaultBuilder.name);

        setStacks(defaultBuilder.builders);
        setSelectedStack(defaultStack);

        setSelectedBuildpacks(detectedBuildpacks);
        setAvailableBuildpacks(availableBuildpacks);
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

  const renderBuildpacksList = (buildpacks: Buildpack[]) => {
    return buildpacks.map((buildpack) => {
      const icon = `devicon-${buildpack?.name?.toLowerCase()}-plain colored`;

      return (
        <StyledCard onClick={() => console.log("some")} status={"some"}>
          <ContentContainer>
            <Icon className={icon} />
            <EventInformation>
              <EventName>{buildpack?.name}</EventName>
            </EventInformation>
          </ContentContainer>
          <ActionContainer>
            <DeleteButton
              onClick={() => handleRemoveBuildpack(buildpack.buildpack)}
            >
              <span className="material-icons">delete</span>
            </DeleteButton>
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

  // const handleAddBuildpack = (buildpackToAdd: string) => {
  //   setAvailableBuildpacks((avBuildpacks) => {
  //     const tmpAvailableBuildpacks = [...avBuildpacks];
  //     return []
  //   })
  // }

  return (
    <>
      <>
        <Selector
          activeValue={selectedBuilder}
          width="100%"
          options={builderOptions}
          setActiveValue={(option) => setSelectedBuilder(option)}
        />
        <Selector
          activeValue={selectedStack}
          width="100%"
          options={stackOptions}
          setActiveValue={(option) => setSelectedStack(option)}
        />
        <Heading>Buildpacks</Heading>
        <Helper>
          These are automatically detected buildpacks but you can change them if
          you want
        </Helper>

        {renderBuildpacksList(availableBuildpacks)}
      </>
    </>
  );
};

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Subtitle = styled.div`
  margin-top: 21px;
`;

const RegistryItem = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean; lastItem: boolean }) =>
    props.isSelected ? "#ffffff11" : ""};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    filter: grayscale(100%);
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  background: #ffffff11;
  overflow-y: auto;
  margin-bottom: 15px;
`;

const StatusWrapper = styled.div<{ successful?: boolean }>`
  display: flex;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-right: 25px;
  margin-left: 20px;
  margin-top: 26px;

  > i {
    font-size: 18px;
    margin-right: 10px;
    color: ${(props) => (props.successful ? "#4797ff" : "#fcba03")};
  }

  animation: statusFloatIn 0.5s;
  animation-fill-mode: forwards;

  @keyframes statusFloatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;

const Br = styled.div`
  width: 100%;
  height: 1px;
  margin-bottom: -8px;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-bottom: -18px;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid "#ffffff44";
  background: #ffffff08;
  margin-bottom: 5px;
  border-radius: 10px;
  padding: 14px;
  overflow: hidden;
  height: 80px;
  font-size: 13px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
    border: 1px solid "#ffffff66";
  }
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

const EventReason = styled.div`
  font-family: "Work Sans", sans-serif;
  color: #aaaabb;
  margin-top: 5px;
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
  color: #ffffff44;
  :hover {
    background: #32343a;
    cursor: pointer;
  }
`;
