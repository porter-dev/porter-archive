import AnimateHeight from "react-animate-height";
import React from "react";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";
import { RouteComponentProps, withRouter } from "react-router";
import SharedBuildSettings from "../build-settings/SharedBuildSettings";
import { BuildMethod, PorterApp } from "../types/porterApp";
import ImageSettings from "../image-settings/ImageSettings";

type Props = RouteComponentProps & {
  source: SourceType | undefined;
  imageUrl: string;
  setImageUrl: (x: string) => void;
  imageTag: string;
  setImageTag: (x: string) => void;
  setPorterYaml: (yaml: string, filename: string) => void;
  porterApp: PorterApp;
  setPorterApp: React.Dispatch<React.SetStateAction<PorterApp>>;
  buildView: BuildMethod;
  setBuildView: (buildView: BuildMethod) => void;
  projectId: number;
  resetImageInfo: () => void;
};

const SourceSettings: React.FC<Props> = ({
  source,
  imageUrl,
  setImageUrl,
  imageTag,
  setImageTag,
  setPorterYaml,
  porterApp,
  setPorterApp,
  buildView,
  setBuildView,
  projectId,
  resetImageInfo,
}) => {
  return (
    <SourceSettingsContainer>
      <AnimateHeight height={source ? "auto" : 0}>
        <Spacer y={1} />
        {source === "github" ? (
          <SharedBuildSettings
            setPorterYaml={setPorterYaml}
            porterApp={porterApp}
            updatePorterApp={(attrs: Partial<PorterApp>) => setPorterApp((prev: PorterApp) => PorterApp.setAttributes(prev, attrs))}
            autoDetectionOn={true}
            canChangeRepo={true}
            buildView={buildView}
            setBuildView={setBuildView}
          />
        ) :
          <ImageSettings
            projectId={projectId}
            imageTag={imageTag}
            setImageTag={setImageTag}
            imageUri={imageUrl}
            setImageUri={setImageUrl}
            resetImageInfo={resetImageInfo}
          />
        }
      </AnimateHeight>
    </SourceSettingsContainer>
  );
};

export default withRouter(SourceSettings);

const SourceSettingsContainer = styled.div``;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
`;

const StyledSourceBox = styled.div`
  width: 100%;
  color: #ffffff;
  padding: 14px 35px 20px;
  position: relative;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 25px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
`;
