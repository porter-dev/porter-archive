import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React from "react";
import BuildpackList from "./BuildpackList";
import AddCustomBuildpackComponent from "./AddCustomBuildpack";
import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import styled from "styled-components";
import { Buildpack } from "main/home/app-dashboard/types/buildpack";
import {  useFieldArray, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { BuildOptions } from "lib/porter-apps/build";

type Props = {
  build: BuildOptions & {
    method: "pack";
  };
  closeModal: () => void;
  availableBuildpacks: Buildpack[];
  setAvailableBuildpacks: (buildpacks: Buildpack[]) => void;
  isDetectingBuildpacks: boolean;
  detectBuildpacksError: string;
};

const BuildpackConfigurationModal: React.FC<Props> = ({
  build,
  closeModal,
  availableBuildpacks,
  setAvailableBuildpacks,
  isDetectingBuildpacks,
  detectBuildpacksError,
}) => {
  const { control } = useFormContext<PorterAppFormData>();
  const { append } = useFieldArray({
    control,
    name: "app.build.buildpacks",
  });

  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>Buildpack Configuration</Text>
      <Scrollable>
        <BuildpackList
          build={build}
          availableBuildpacks={availableBuildpacks}
          setAvailableBuildpacks={setAvailableBuildpacks}
          showAvailableBuildpacks={true}
          isDetectingBuildpacks={isDetectingBuildpacks}
          detectBuildpacksError={detectBuildpacksError}
          droppableId={"modal"}
          showFullBuildpackName={true}
        />
        <Spacer y={0.5} />
        <Text>Custom buildpacks</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          You may also add buildpacks by directly providing their GitHub links
          or links to ZIP files that contain the buildpack source code.
        </Text>
        <Spacer y={1} />
        <AddCustomBuildpackComponent
          onAdd={(bp) => {
            append(bp);
          }}
        />        
        <Spacer y={2} />
      </Scrollable>
      <Footer>
        <Shade />
        <FooterButtons>
          <Button onClick={closeModal} width={"75px"}>
            Close
          </Button>
        </FooterButtons>
      </Footer>
    </Modal>
  );
};
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
  justify-content: flex-end;
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
