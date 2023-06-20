import AnimateHeight from "react-animate-height";
import React from "react";
import Spacer from "components/porter/Spacer";
import styled from "styled-components";
import { SourceType } from "./SourceSelector";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";
import ImageSelector from "components/image-selector/ImageSelector";
import SharedBuildSettings from "../build-settings/SharedBuildSettings";
import Link from "components/porter/Link";
import { PorterApp } from "../types/porterApp";

type Props = RouteComponentProps & {
  source: SourceType | undefined;
  imageUrl: string;
  setImageUrl: (x: string) => void;
  imageTag: string;
  setImageTag: (x: string) => void;
  setPorterYaml: (x: any) => void;
  porterApp: PorterApp;
  setPorterApp: (x: PorterApp) => void;
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
  location,
  history,
}) => {
  return (
    <SourceSettingsContainer>
      <AnimateHeight height={source ? "auto" : 0}>
        <Spacer y={1} />
        {source === "github" ? (
          <SharedBuildSettings
            setPorterYaml={setPorterYaml}
            porterApp={porterApp}
            updatePorterApp={(attrs: Partial<PorterApp>) => setPorterApp(PorterApp.setAttributes(porterApp, attrs))}
            detectBuildpacks={true}
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
          </StyledSourceBox>)
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
