import AnimateHeight from "react-animate-height";
import React from "react";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";
import { ActionConfigType } from "shared/types";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";
import ImageSelector from "components/image-selector/ImageSelector";
import SharedBuildSettings from "../expanded-app/SharedBuildSettings";
import Link from "components/porter/Link";
import { PorterApp } from "../types/porterApp";

type Props = RouteComponentProps & {
  source: SourceType | undefined;
  imageUrl: string;
  setImageUrl: (x: string) => void;
  imageTag: string;
  setImageTag: (x: string) => void;
  actionConfig: ActionConfigType;
  setActionConfig: (
    x: ActionConfigType | ((prevState: ActionConfigType) => ActionConfigType)
  ) => void;
  branch: string;
  setBranch: (x: string) => void;
  dockerfilePath: string | null;
  setDockerfilePath: (x: string) => void;
  folderPath: string | null;
  setFolderPath: (x: string) => void;
  setBuildConfig: (x: any) => void;
  porterYaml: string;
  setPorterYaml: (x: any) => void;
  buildView: string;
  setBuildView: (x: string) => void;
  setCurrentStep: (x: number) => void;
  currentStep: number;
  porterYamlPath: string;
  setPorterYamlPath: (x: string) => void;
  porterApp: PorterApp;
  setPorterApp: (x: PorterApp) => void;
};

const SourceSettings: React.FC<Props> = ({
  source,
  imageUrl,
  setImageUrl,
  imageTag,
  setImageTag,
  actionConfig,
  setActionConfig,
  branch,
  setBranch,
  dockerfilePath,
  setDockerfilePath,
  folderPath,
  setFolderPath,
  setBuildConfig,
  porterYaml,
  setPorterYaml,
  buildView,
  setBuildView,
  setPorterYamlPath,
  porterYamlPath,
  porterApp,
  setPorterApp,
  location,
  history,
}) => {
  return (
    <SourceSettingsContainer>
      <AnimateHeight height={source ? "auto" : 0}>
        <Spacer y={1} />
        {source === "github" ? (
          <SharedBuildSettings
            actionConfig={actionConfig}
            branch={branch}
            dockerfilePath={dockerfilePath}
            folderPath={folderPath}
            setActionConfig={setActionConfig}
            setDockerfilePath={setDockerfilePath}
            setFolderPath={setFolderPath}
            setBuildConfig={setBuildConfig}
            porterYaml={porterYaml}
            setPorterYaml={setPorterYaml}
            setBranch={setBranch}
            setImageUrl={setImageUrl}
            buildView={buildView}
            setBuildView={setBuildView}
            porterYamlPath={porterYamlPath}
            setPorterYamlPath={setPorterYamlPath}
          />
        ) : (
          <StyledSourceBox>
            <Subtitle>
              Specify the container image you would like to connect to this
              template.
              <Spacer inline width="5px" />
              <Link
                hasunderline
                onClick={() =>
                  pushFiltered({ location, history }, "/integrations/registry", ["project_id"])
                }
              >
                Manage Docker registries
              </Link>
            </Subtitle>
            <DarkMatter antiHeight="-4px" />
            <ImageSelector
              selectedTag={imageTag}
              selectedImageUrl={imageUrl}
              setSelectedImageUrl={setImageUrl}
              setSelectedTag={setImageTag}
              forceExpanded={true}
            />
            <br />
          </StyledSourceBox>)}
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
