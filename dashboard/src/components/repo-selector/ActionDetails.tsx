import React, { useContext, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

import { integrationList } from "shared/common";
import { Context } from "shared/Context";
import api from "shared/api";
import Loading from "components/Loading";
import { ActionConfigType } from "../../shared/types";
import InputRow from "../form-components/InputRow";
import Heading from "components/form-components/Heading";
import { BuildpackSelection } from "./BuildpackSelection";

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
  setBuildConfig: (x: any) => void;
};

const ActionDetails: React.FC<PropsType> = (props) => {
  const {
    actionConfig,
    branch,
    dockerfilePath,
    folderPath,
    selectedRegistry,
    setDockerfilePath,
    setFolderPath,
    setProcfilePath,
    setProcfileProcess,
    setSelectedRegistry,
    setBuildConfig,
  } = props;

  const { currentProject } = useContext(Context);
  const [registries, setRegistries] = useState<any[]>(null);
  const [loading, setLoading] = useState(true);
  const [showBuildpacksConfig, setShowBuildpacksConfig] = useState(false);

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
      <Heading>GitHub settings</Heading>
      <InputRow
        disabled={true}
        label="Git repository"
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
          label="Dockerfile path"
          type="text"
          width="100%"
          value={dockerfilePath}
        />
      )}
      <InputRow
        // Currently there is a bug which is failing to detect the correct application folder root path. As a hotfix, we are enabling the user to manually set the application folder path.
        disabled={false}
        label={dockerfilePath ? "Docker build context" : "Application folder"}
        type="text"
        width="100%"
        setValue={(value) => typeof value === "string" && setFolderPath(value)}
        value={folderPath}
      />
      {renderRegistrySection()}
      {!dockerfilePath && (
        <>
          <Heading>
            <ExpandHeader
              onClick={() => setShowBuildpacksConfig((prev) => !prev)}
              isExpanded={showBuildpacksConfig}
            >
              Buildpacks Settings
              <i className="material-icons">arrow_drop_down</i>
            </ExpandHeader>
          </Heading>
          <BuildpackSelection
            actionConfig={actionConfig}
            branch={branch}
            folderPath={folderPath}
            onChange={(config) => {
              setBuildConfig(config);
            }}
            hide={!showBuildpacksConfig}
          />
          <Buffer />
        </>
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
          Select folder
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

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const ExpandHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  cursor: pointer;
  > i {
    margin-left: 10px;
    transform: ${(props) => (props.isExpanded ? "" : "rotate(180deg)")};
  }
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
`;

const Buffer = styled.div`
  width: 100%;
  height: 8px;
`;

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
  margin-bottom: -28px;
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
