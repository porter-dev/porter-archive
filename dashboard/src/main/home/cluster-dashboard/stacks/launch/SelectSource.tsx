import ImageSelector from "components/image-selector/ImageSelector";
import React, { useContext, useState } from "react";
import { StacksLaunchContext } from "./Store";
import { CreateStackBody } from "../types";
import { useRouting } from "shared/routing";

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
    <>
      <ImageSelector
        selectedImageUrl={imageUrl}
        setSelectedImageUrl={setImageUrl}
        selectedTag={imageTag}
        setSelectedTag={setImageTag}
        forceExpanded
      />

      <button disabled={!imageUrl || !imageTag} onClick={handleNext}>
        Next
      </button>
    </>
  );
};

export default SelectSource;
