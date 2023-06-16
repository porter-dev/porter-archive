import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AnimateHeight from "react-animate-height";
import { BuildpackStack } from "components/repo-selector/BuildpackStack";
import { ActionConfigType, BuildConfig } from "shared/types";
import Select from "components/porter/Select";

interface AutoBuildpack {
  name?: string;
  valid: boolean;
}

interface AdvancedBuildSettingsProps {
  autoBuildPack?: AutoBuildpack;
  buildView: string;
  showSettings: boolean;
  actionConfig: ActionConfigType | null;
  branch: string;
  folderPath: string;
  dockerfilePath?: string;
  setDockerfilePath: (x: string) => void;
  setBuildConfig?: (x: any) => void;
  currentBuildConfig?: BuildConfig;
  setBuildView: (x: string) => void;
}

type Buildpack = {
  name: string;
  buildpack: string;
  config?: {
    [key: string]: string;
  };
};

const AdvancedBuildSettings: React.FC<AdvancedBuildSettingsProps> = (props) => {
  const [showSettings, setShowSettings] = useState<boolean>(props.showSettings);
  const buildView = props.setBuildView(props.buildView || "buildpacks");

  useEffect(() => { }, [props.buildView]);
  const createDockerView = () => {
    // props.setBuildConfig({});
    return (
      <>
        <Text color="helper">Dockerfile path (absolute path)</Text>
        <Spacer y={0.5} />
        <Input
          placeholder="ex: ./Dockerfile"
          value={props.dockerfilePath}
          width="300px"
          setValue={props.setDockerfilePath}
        />
        <Spacer y={0.5} />
      </>
    );
  };

  const createBuildpackView = () => {
    return (
      <>
        <BuildpackStack
          actionConfig={props.actionConfig}
          branch={props.branch}
          folderPath={props.folderPath}
          onChange={(config) => {
            props.setBuildConfig(config);
          }}
          hide={false}
          currentBuildConfig={props.currentBuildConfig}
          setBuildConfig={props.setBuildConfig}
        />
      </>
    );
  };

  return (
    <>
      <StyledAdvancedBuildSettings
        showSettings={showSettings}
        isCurrent={true}
        onClick={() => {
          setShowSettings(!showSettings);
        }}
      >
        {props.buildView == "docker" ? (
          <AdvancedBuildTitle>
            <i className="material-icons dropdown">arrow_drop_down</i>
            Configure Dockerfile settings
          </AdvancedBuildTitle>
        ) : (
          <AdvancedBuildTitle>
            <i className="material-icons dropdown">arrow_drop_down</i>
            Configure buildpack settings
          </AdvancedBuildTitle>
        )}
      </StyledAdvancedBuildSettings>

      <AnimateHeight height={showSettings ? "auto" : 0} duration={1000}>
        <StyledSourceBox>
          <Select
            value={props.buildView}
            width="300px"
            options={[
              { value: "docker", label: "Docker" },
              { value: "buildpacks", label: "Buildpacks" },
            ]}
            setValue={(option) => props.setBuildView(option)}
            label="Build method"
          />
          <Spacer y={1} />
          {props.buildView === "docker"
            ? createDockerView()
            : createBuildpackView()}
        </StyledSourceBox>
      </AnimateHeight>
    </>
  );
};

export default AdvancedBuildSettings;

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};

  .dropdown {
    margin-right: 8px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: ${(props: { showSettings: boolean; isCurrent: boolean }) =>
    props.showSettings ? "" : "rotate(-90deg)"};
  }
`;

const AdvancedBuildTitle = styled.div`
  display: flex;
  align-items: center;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 25px 35px 25px;
  position: relative;
  font-size: 13px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;
