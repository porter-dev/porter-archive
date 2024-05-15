import React, { useContext } from "react";
import { useHistory, useParams } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import CenterWrapper from "components/porter/CenterWrapper";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { models } from "./models";
import Gpt2Form from "./TemplateForms/Gpt2Form";
import { Context } from "shared/Context";
import { SUPPORTED_MODEL_ADDON_TEMPLATES } from "lib/models/template";
import AddonForm from "../add-on-dashboard/AddonForm";
import AddonFormContextProvider from "../add-on-dashboard/AddonFormContextProvider";

const InferenceForm: React.FC = () => {
  const { modelType } = useParams<{
    modelType: string;
  }>();

  const { currentProject } = useContext(Context);
  const history = useHistory();

  const templateMatch = SUPPORTED_MODEL_ADDON_TEMPLATES.find((t) => t.type === modelType);

  if (templateMatch === undefined) {
    return null;
  }

  return (
    <AddonFormContextProvider projectId={currentProject?.id} redirectOnSubmit>
      <AddonForm template={templateMatch} />
    </AddonFormContextProvider>
  );
};

export default InferenceForm;

const FloatIn = styled.div`
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
