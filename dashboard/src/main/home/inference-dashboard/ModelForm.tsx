import React from "react";
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

const InferenceForm: React.FC = () => {
  const { templateId } = useParams<{
    templateId: string;
  }>();
  const history = useHistory();

  const template = models[templateId] || {
    name: "",
    icon: "",
    description: "",
    tags: [],
  };

  const renderForm = (): React.ReactElement => {
    return match(templateId)
      .returnType<JSX.Element>()
      .with("gpt-2", () => <Gpt2Form />)
      .otherwise(() => <div>Template not found</div>);
  };

  return (
    <CenterWrapper>
      <Back
        onClick={() => {
          history.push(`/inference/templates/${templateId}`);
        }}
      />
      <Container row>
        <FloatIn>
          <Image size={24} src={template.icon} />
        </FloatIn>
        <Spacer inline x={1} />
        <Text size={21}>Configure new {template.name} instance</Text>
      </Container>
      <Spacer y={1} />
      {renderForm()}
    </CenterWrapper>
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
