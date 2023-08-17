import React from "react";
import styled from "styled-components";

import { pushFiltered } from "shared/routing";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import ImageSelector from "components/image-selector/ImageSelector";
import { Controller, useFormContext } from "react-hook-form";
import { ClientPorterApp, PorterAppFormData } from "lib/porter-apps";

const ImageSettings: React.FC = ({}) => {
  const { control } = useFormContext<PorterAppFormData>();

  return (
    <StyledSourceBox>

      <Subtitle>
        Specify the container image you would like to connect to this template.
        <Spacer inline width="5px" />
        <Link
          hasunderline
          onClick={() =>
            pushFiltered({ location, history }, "/integrations/registry", [
              "project_id",
            ])
          }
        >
          Manage Docker registries
        </Link>
      </Subtitle>
      <DarkMatter antiHeight="-4px" />
      {/* // todo(ianedwards): rewrite image selector to be more easily controllable by form */}
      <Controller
        name="app.image"
        control={control}
        render={({ field: { onChange, value } }) => (
          <ImageSelector
            selectedTag={value?.tag || ""}
            selectedImageUrl={value?.repository || ""}
            setSelectedImageUrl={(imageUrl) => {
              onChange((prev: ClientPorterApp["image"]) => ({
                ...prev,
                repository: imageUrl,
              }));
            }}
            setSelectedTag={(tag) => {
              onChange((prev: ClientPorterApp["image"]) => ({
                ...prev,
                tag,
              }));
            }}
            forceExpanded={true}
          />
        )}
      />

      <br />
    </StyledSourceBox>
  );
};

export default ImageSettings;

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
