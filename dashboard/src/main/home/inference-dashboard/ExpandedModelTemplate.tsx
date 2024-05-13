import React from "react";
import AceEditor from "react-ace";
import { useHistory, useParams } from "react-router";
import styled from "styled-components";

import Back from "components/porter/Back";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import I from "components/porter/I";
import Image from "components/porter/Image";
import InfoSection from "components/porter/InfoSection";
import Line from "components/porter/Line";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";

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
      <Container row spaced>
        <Container row>
          <Image size={24} src={template.icon} />
          <Spacer inline x={1} />
          <Text size={21}>{template.name}</Text>
        </Container>
        <Link to={`/inference/templates/${templateId}/new`}>
          <Button>
            <I size={14}>add</I>
            <Spacer inline x={0.5} />
            Deploy model
          </Button>
        </Link>
      </Container>
      <Spacer y={1} />
      <InfoSection text={template.description} />
      <Spacer y={1} />
      <Container row>
        {template.tags?.map((t) => (
          <>
            <Tag key={t} backgroundColor={tagColor[t]} hoverable={false}>
              {t}
            </Tag>
            <Spacer inline x={1} />
          </>
        ))}
      </Container>
      <Spacer y={1} />
      <Line />
      <Spacer y={1} />
      <Text size={16}>Example usage</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        After deploying this model, you will be able to use it over an
        auto-generated endpoint from any app running on Porter.
      </Text>
      <Spacer y={1} />
      <AceEditor
        value={`curl http://my-model.default.svc.cluster.local:8000/v1/completions
  -H "Content-Type: application/json"
  -d '{
      "prompt": "Long Island City is a",
      "max_tokens": 7,
      "temperature": 0
  }'`}
        theme="porter"
        name="codeEditor"
        readOnly={true}
        height="120px"
        width="100%"
        style={{ borderRadius: "10px", color: "#aaaabb" }}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={false}
      />
    </Container>
  );
};

export default ExpandedModelTemplate;
