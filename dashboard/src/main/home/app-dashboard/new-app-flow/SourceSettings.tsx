import AnimateHeight from "react-animate-height";
import React from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Input from "components/porter/Input";
import AdvancedBuildSettings from "./AdvancedBuildSettings";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";

interface SourceSettingsProps {
    source: SourceType | undefined;
}

const SourceSettings: React.FC<SourceSettingsProps> = ({
    source
}) => {
    const renderGithubSettings = () => {
        return (
            <>
                <Text size={16}>Build settings</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                    Select your Github repository.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: academic-sophon"
                    value=""
                    width="100%"
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
                    width="100%"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Specify your application root path.
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: ./"
                    value=""
                    width="100%"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Specify your porter.yaml path. <a>&nbsp;What is this?</a>
                </Text>
                <Spacer y={0.5} />
                <Input
                    placeholder="ex: ./porter.yaml"
                    value=""
                    width="100%"
                    setValue={(e) => { }}
                />
                <Spacer y={1} />
                <DetectedBuildMessage>
                    <i className="material-icons">check</i>
                    Detected Dockerfile at ./Dockerfile
                </DetectedBuildMessage>
                <Spacer y={1} />
                <AdvancedBuildSettings />
            </>
        )
    }

    const renderDockerSettings = () => {
        return (
            <>
                <Text size={16}>Registry settings</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                    Select your Github repository.
                </Text>
                <Spacer height="20px" />
                <Input
                    placeholder="ex: academic-sophon"
                    value=""
                    width="100%"
                    setValue={(e) => { }}
                />
                <Spacer y={0.5} />
                <Text color="helper">
                    Select your branch.
                </Text>
            </>
        )
    }

    return (
        <SourceSettingsContainer source={source}>
            <AnimateHeight
                height={source ? 'auto' : 0}
            >
                <div >
                    {source === "github" ? renderGithubSettings() : renderDockerSettings()}
                </div>
            </AnimateHeight >
        </SourceSettingsContainer>
    )
}

export default SourceSettings;

const SourceSettingsContainer = styled.div`
    margin-top: ${(props: { source: SourceType | undefined }) => props.source && "20px"};
`;
const DetectedBuildMessage = styled.div`
  color: #0f872b;
  display: flex;
  align-items: center;
  border-radius: 5px;
  margin-right: 10px;

  > i {
    margin-right: 6px;
    font-size: 20px;
    border-radius: 20px;
    transform: none;
  }
`;