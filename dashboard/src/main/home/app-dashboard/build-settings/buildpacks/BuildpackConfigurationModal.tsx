import Spacer from 'components/porter/Spacer';
import Text from 'components/porter/Text';
import React from 'react';
import BuildpackList from './BuildpackList';
import AddCustomBuildpackComponent from './AddCustomBuildpackComponent';
import Icon from 'components/porter/Icon';
import Button from 'components/porter/Button';
import Modal from 'components/porter/Modal';
import styled from 'styled-components';
import Select from 'components/porter/Select';
import stars from "assets/stars-white.svg";
import { Buildpack } from '../../types/buildpack';
import { PorterApp } from '../../types/porterApp';

interface Props {
    closeModal: () => void;
    selectedStack: string;
    sortedStackOptions: { value: string; label: string }[];
    setStackValue: (value: string) => void;
    selectedBuildpacks: Buildpack[];
    setSelectedBuildpacks: (buildpacks: Buildpack[]) => void;
    availableBuildpacks: Buildpack[];
    setAvailableBuildpacks: (buildpacks: Buildpack[]) => void;
    porterApp: PorterApp;
    updatePorterApp: (attrs: Partial<PorterApp>) => void;
    isDetectingBuildpacks: boolean;
    detectBuildpacksError: string;
    handleAddCustomBuildpack: (buildpack: Buildpack) => void;
    detectAndSetBuildPacks: (detect: boolean) => void;
}
const BuildpackConfigurationModal: React.FC<Props> = ({
    closeModal,
    selectedStack,
    sortedStackOptions,
    setStackValue,
    selectedBuildpacks,
    setSelectedBuildpacks,
    availableBuildpacks,
    setAvailableBuildpacks,
    porterApp,
    updatePorterApp,
    isDetectingBuildpacks,
    detectBuildpacksError,
    handleAddCustomBuildpack,
    detectAndSetBuildPacks,
}) => {
    return (
        <Modal closeModal={closeModal}>
            <Text size={16}>Buildpack Configuration</Text>
            <Spacer y={1} />
            <Scrollable>
                <Text>Builder:</Text>
                {selectedStack === "" &&
                    <>
                        <Spacer y={0.5} />
                        <Text color="helper">
                            No builder detected. Click 'Detect buildpacks' below to scan your repository for available builders and buildpacks.
                        </Text>
                    </>
                }
                {selectedStack !== "" &&
                    <>
                        <Spacer y={0.5} />
                        <Select
                            value={selectedStack}
                            width="300px"
                            options={sortedStackOptions}
                            setValue={setStackValue}
                        />
                    </>
                }
                <BuildpackList
                    selectedBuildpacks={selectedBuildpacks}
                    setSelectedBuildpacks={setSelectedBuildpacks}
                    availableBuildpacks={availableBuildpacks}
                    setAvailableBuildpacks={setAvailableBuildpacks}
                    porterApp={porterApp}
                    updatePorterApp={updatePorterApp}
                    showAvailableBuildpacks={true}
                    isDetectingBuildpacks={isDetectingBuildpacks}
                    detectBuildpacksError={detectBuildpacksError}
                    droppableId={"modal"}
                />
                <Spacer y={0.5} />
                <Text>
                    Custom buildpacks
                </Text>
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
                    <Button onClick={closeModal} width={"75px"}>Close</Button>
                </FooterButtons>
            </Footer>
        </Modal>
    );
}
export default BuildpackConfigurationModal;

const Scrollable = styled.div`
  overflow-y: auto;
  padding: 0 25px;
  width: calc(100% + 50px);
  margin-left: -25px;
  max-height: calc(100vh - 300px);
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

const Shade = styled.div`
  position: absolute;
  top: -50px;
  left: 0;
  height: 50px;
  width: 100%;
  background: linear-gradient(to bottom, #00000000, ${({ theme }) => theme.fg});
`;