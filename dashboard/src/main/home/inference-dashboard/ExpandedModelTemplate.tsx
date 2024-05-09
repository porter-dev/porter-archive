import React from "react";
import { useHistory, useParams } from "react-router";
import styled from "styled-components";

import Back from "components/porter/Back";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";

import inferenceGrad from "assets/inference-grad.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { models, tagColor } from "./models";

const ExpandedModelTemplate: React.FC = () => {
  const { templateId } = useParams<{
    templateId: string;
  }>();

  const template = models[templateId] || {
    name: "",
    description: "",
    tags: [],
  };

  return (
    <Container style={{ width: "100%" }}>
      <Back to="/inference/templates" />
      <DashboardHeader
        capitalize={false}
        description={template.description}
        disableLineBreak
      />
    </Container>
  );
};

export default ExpandedModelTemplate;

const Wrapper = styled.div`
  width: 100%;
  background: red;
`;

const Idk = styled.div`
  flex: 1;
  height: 5px;
  width: 100%;
  background: red;
`;
