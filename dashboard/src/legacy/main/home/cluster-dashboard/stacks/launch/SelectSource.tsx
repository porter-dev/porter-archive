import React, { useContext, useState } from "react";
import Heading from "legacy/components/form-components/Heading";
import Helper from "legacy/components/form-components/Helper";
import InputRow from "legacy/components/form-components/InputRow";
import ImageSelector from "legacy/components/image-selector/ImageSelector";
import TitleSection from "legacy/components/TitleSection";
import { useRouting } from "legacy/shared/routing";
import styled from "styled-components";

import { CreateStackBody } from "../types";
import { SubmitButton } from "./components/styles";
import { StacksLaunchContext } from "./Store";

const SelectSource = () => {
  const { addSourceConfig } = useContext(StacksLaunchContext);
  const [sourceName, setSourceName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageTag, setImageTag] = useState("");
  const { pushFiltered } = useRouting();

  const handleNext = () => {
    if (!imageUrl || !imageTag) {
      return;
    }

    const newSource: Omit<CreateStackBody["source_configs"][0], "name"> = {
      display_name: sourceName,
      image_repo_uri: imageUrl,
      image_tag: imageTag,
    };

    addSourceConfig(newSource);
    pushFiltered("/stacks/launch/overview", []);
  };

  return (
    <>
      <TitleSection handleNavBack={() => window.open("/stacks", "_self")}>
        <Polymer>
          <i className="material-icons">lan</i>
        </Polymer>
        New Application Stack
      </TitleSection>
      <Heading>Stack Source</Heading>

      <Br />
      <InputRowWrapper>
        <InputRow
          label="Source Name"
          value={sourceName}
          setValue={(val) => setSourceName(val as string)}
          type="text"
          width="100%"
          placeholder="Leave empty for auto-generated source config name"
        />
      </InputRowWrapper>

      <Helper>
        Specify a source to deploy all stack applications from:
        <Required>*</Required>
      </Helper>
      <ImageSelector
        selectedImageUrl={imageUrl}
        setSelectedImageUrl={setImageUrl}
        selectedTag={imageTag}
        setSelectedTag={setImageTag}
        forceExpanded
      />
      <Br height="30px" />
      <SubmitButton
        disabled={!imageUrl || !imageTag}
        onClick={handleNext}
        text="Continue"
        clearPosition
        makeFlush
      />
    </>
  );
};

export default SelectSource;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${(props) => props.height || "1px"};
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Polymer = styled.div`
  margin-bottom: -6px;

  > i {
    color: #ffffff;
    font-size: 24px;
    margin-left: 5px;
    margin-right: 18px;
  }
`;

const InputRowWrapper = styled.div`
  width: 60%;
`;
