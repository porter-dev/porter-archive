import React, { useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import Toggle from "components/porter/Toggle";

interface AdvancedBuildSettingsProps {

}


const AdvancedBuildSettings: React.FC<AdvancedBuildSettingsProps> = ({
}) => {
    const [showSettings, setShowSettings] = useState(false)
    const [buildView, setBuildView] = useState<string>('docker')

    const createDockerView = () => {
        return (
            <>
                <Text size={16}>Build settings</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                    Select your Github repository.
                </Text>
                <Spacer height="20px" />
                <Input
                    placeholder="ex: academic-sophon"
                    value=""
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Select your branch.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: academic-sophon"
                    value=""
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Specify your application root path.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: academic-sophon"
                    value="./"
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={1} />
            </>
        )
    }
    return (
        <>
            <StyledAdvancedBuildSettings showSettings={showSettings} isCurrent={true} onClick={() => setShowSettings(!showSettings)} >
                <AdvancedBuildTitle>
                    <i className="material-icons">arrow_drop_down</i>
                    Advanced build settings (optional)
                </AdvancedBuildTitle>
                <div>
                    <DetectedBuildMessage>
                        <i className="material-icons">check</i>
                        Detected Dockerfile
                    </DetectedBuildMessage>
                </div>
            </StyledAdvancedBuildSettings>
            {showSettings &&
                <StyledSourceBox>
                    <ToggleWrapper>
                        <Toggle items={[
                            { label: 'Docker', value: "docker" },
                            { label: 'Buildpacks', value: "buildpacks" },
                        ]}
                            active={buildView}
                            setActive={setBuildView}
                        />
                    </ToggleWrapper>
                    {buildView === 'docker' && createDockerView()}
                </StyledSourceBox>
            }
        </>
    );
}

export default AdvancedBuildSettings

const StyledAdvancedBuildSettings = styled.div`
  color:  "#ffffff66";
  background: #26292e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 5px;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  :hover {
    background: #7a7b80;
  }
  border-bottom-left-radius: ${({ showSettings }) => showSettings && "0px"};
  border-bottom-right-radius: ${({ showSettings }) => showSettings && "0px"};

  > div > i {
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

const DetectedBuildMessage = styled.div`
  color: #0f872b;
  display: flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 5px;
  margin-right: 10px;

  > i {
    margin-right: 6px;
    font-size: 20px;
    cursor: pointer;
    border-radius: 20px;
    transform: none;
  }
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  margin-bottom: 25px;
  border-radius: 5px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  border-top: 0px;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
`;

const ToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
`