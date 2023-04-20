import React, { useState } from "react";
import styled from "styled-components";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import Toggle from "components/porter/Toggle";
import AnimateHeight from 'react-animate-height';
import { DeviconsNameList } from "assets/devicons-name-list";

interface AdvancedBuildSettingsProps {

}

type Buildpack = {
    name: string;
    buildpack: string;
    config?: {
        [key: string]: string;
    };
};


const AdvancedBuildSettings: React.FC<AdvancedBuildSettingsProps> = ({
}) => {
    const [showSettings, setShowSettings] = useState<boolean>(false)
    const [buildView, setBuildView] = useState<string>('docker')

    const createDockerView = () => {
        return (
            <>
                <Text size={16}>Build with a Dockerfile</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                    Specify your Dockerfile path.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: ./Dockerfile"
                    value=""
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Specify your Docker build context.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: academic-sophon"
                    value="./"
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
            </>
        )
    }

    const createBuildpackView = () => {
        return (
            <>
                <Text size={16}>Build with buildpacks</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                    Select a builder.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: heroku/buildpacks:20"
                    value=""
                    width="300px"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    The following buildpacks were automatically detected. You can also
                    manually add/remove buildpacks.
                </Text>
                <Spacer y={0.5} />
                {renderBuildpacksList([{
                    name: 'Python',
                    buildpack: 'heroku/python'
                }], "remove")}
                <Text color="helper">
                    Available buildpacks:
                </Text>
                <Spacer y={0.5} />
                {renderBuildpacksList([{
                    name: 'Ruby',
                    buildpack: 'heroku/ruby'
                }], "add")}
            </>
        )
    }

    const renderBuildpacksList = (
        buildpacks: Buildpack[],
        action: "remove" | "add"
    ) => {
        return (buildpacks?.map((buildpack) => {
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
                            <ActionButton>
                                <span className="material-icons-outlined">add</span>
                            </ActionButton>
                        )}
                        {action === "remove" && (
                            <ActionButton>
                                <span className="material-icons">delete</span>
                            </ActionButton>
                        )}
                    </ActionContainer>
                </StyledCard>
            );
        }));
    };

    return (
        <>
            <StyledAdvancedBuildSettings
                showSettings={showSettings}
                isCurrent={true}
                onClick={() => {
                    setShowSettings(!showSettings)
                }
                } >
                <AdvancedBuildTitle>
                    <i className="material-icons dropdown">arrow_drop_down</i>
                    Configure advanced build settings (optional)
                </AdvancedBuildTitle>
            </StyledAdvancedBuildSettings>

            <AnimateHeight
                height={showSettings ? 'auto' : 0}
                duration={1000}
            >
                <StyledSourceBox>
                    <ToggleWrapper>
                        <Toggle
                            items={[
                                { label: 'Docker', value: "docker" },
                                { label: 'Buildpacks', value: "buildpacks" },
                            ]}
                            active={buildView}
                            setActive={setBuildView}
                            highlightColor="#8590ff"
                        />
                    </ToggleWrapper>
                    <Spacer y={0.5} />
                    {buildView === 'docker' ? createDockerView() : createBuildpackView()}
                </StyledSourceBox>
            </AnimateHeight>

        </>
    );
}

export default AdvancedBuildSettings

const StyledAdvancedBuildSettings = styled.div`
  color: ${({ showSettings }) => showSettings ? "white" : "#aaaabb"};
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color:  white;
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
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
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