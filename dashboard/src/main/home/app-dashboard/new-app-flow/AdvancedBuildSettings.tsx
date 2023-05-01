import React, { useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import Toggle from "components/porter/Toggle";
import AnimateHeight from "react-animate-height";
import { DeviconsNameList } from "assets/devicons-name-list";
import { BuildpackStack } from "components/repo-selector/BuildpackStack";
import { ActionConfigType, BuildConfig } from "shared/types";
import SelectRow from "components/form-components/SelectRow";
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
  setBuildConfig: (x: any) => void;
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
  const [buildView, setBuildView] = useState<string>(props.buildView);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBuildView(e.target.value);
  };
  const createDockerView = () => {
    return (
      <>
        <Text color="helper">Dockerfile path</Text>
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
            props.setDockerfilePath("");
          }}
          hide={false}
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
        {buildView == "docker" ? (
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
            value={buildView}
            width="300px"
            options={[
              { value: "docker", label: "Docker" },
              { value: "buildpacks", label: "Buildpacks" },
            ]}
            setValue={(option) => setBuildView(option)}
            label="Build method"
          />
          <Spacer y={1} />
          {buildView === "docker" ? createDockerView() : createBuildpackView()}
        </StyledSourceBox>
      </AnimateHeight>
    </>
  );
};

export default AdvancedBuildSettings;

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => (showSettings ? "white" : "#aaaabb")};
  background: #26292e;
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

const ToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
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
const SelectWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  align-items: center;
`;

const SelectLabel = styled.label`
  color: #ffffff;
  font-size: 13px;
  margin-right: 8px;
`;

const StyledSelect = styled.select`
  background-color: #26292e;
  border: 1px solid #494b4f;
  border-radius: 5px;
  color: #aaaabb;
  cursor: pointer;
  font-size: 13px;
  height: 30px;
  outline: none;
  padding: 0 8px;
  width: 150px;

  &:hover {
    border: 1px solid #7a7b80;
    color: #ffffff;
  }
`;
