import React, { useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AnimateHeight from "react-animate-height";
import Select from "components/porter/Select";
import { PorterApp } from "../types/porterApp";
import BuildpackStack from "./BuildpackStack";

interface AdvancedBuildSettingsProps {
  porterApp: PorterApp;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  detectBuildpacks: boolean;
}

const AdvancedBuildSettings: React.FC<AdvancedBuildSettingsProps> = ({
  porterApp,
  updatePorterApp,
  detectBuildpacks,
}) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [buildView, setBuildView] = useState<string>(
    porterApp.dockerfile != null && porterApp.dockerfile !== ""
      ? "docker" : "buildpacks"
  );

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
          {buildView === "docker"
            ?
            <>
              <Text color="helper">Dockerfile path (absolute path)</Text>
              <Spacer y={0.5} />
              <Input
                placeholder="ex: ./Dockerfile"
                value={porterApp.dockerfile}
                width="300px"
                setValue={(val: string) => updatePorterApp({ dockerfile: val })}
              />
              <Spacer y={0.5} />
            </>
            : <BuildpackStack
              porterApp={porterApp}
              updatePorterApp={updatePorterApp}
              detectBuildpacks={detectBuildpacks}
            />}
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
