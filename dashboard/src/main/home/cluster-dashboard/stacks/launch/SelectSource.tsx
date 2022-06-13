import ImageSelector from "components/image-selector/ImageSelector";
import React, { useContext, useState } from "react";
import { StacksLaunchContext } from "./Store";
import { CreateStackBody } from "../types";
import { useRouting } from "shared/routing";
import styled from "styled-components";
import SaveButton from "components/SaveButton";

const SelectSource = () => {
  const { addSourceConfig } = useContext(StacksLaunchContext);

  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("");
  const { pushFiltered } = useRouting();

  const handleNext = () => {
    if (!imageUrl || !imageTag) {
      return;
    }

    const newSource: Omit<CreateStackBody["source_configs"][0], "name"> = {
      image_repo_uri: imageUrl,
      image_tag: imageTag,
    };

    addSourceConfig(newSource);
    pushFiltered("/stacks/launch/overview", []);
  };

  return (
    <div style={{ position: "relative" }}>
      <ImageSelector
        selectedImageUrl={imageUrl}
        setSelectedImageUrl={setImageUrl}
        selectedTag={imageTag}
        setSelectedTag={setImageTag}
        forceExpanded
      />

      <SubmitButton
        disabled={!imageUrl || !imageTag}
        onClick={handleNext}
        text="Next"
        clearPosition
        makeFlush
      />
    </div>
  );
};

export default SelectSource;

const SubmitButton = styled(SaveButton)`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
`;
