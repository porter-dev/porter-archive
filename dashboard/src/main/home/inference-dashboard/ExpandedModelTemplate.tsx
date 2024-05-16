import React, { useContext, useMemo } from "react";
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
import Text from "components/porter/Text";
import {
  AddonTemplateTagColor,
  SUPPORTED_MODEL_ADDON_TEMPLATES,
} from "lib/addons/template";

import { Context } from "shared/Context";

import AddonFormContextProvider from "../add-on-dashboard/AddonFormContextProvider";
import { Tag } from "../add-on-dashboard/AddonTemplates";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { models, tagColor } from "./models";

const ExpandedModelTemplate: React.FC = () => {
  const { modelType } = useParams<{
    modelType: string;
  }>();

  const { currentProject } = useContext(Context);
  const history = useHistory();

  const templateMatch = SUPPORTED_MODEL_ADDON_TEMPLATES.find(
    (t) => t.type === modelType
  );

  if (templateMatch === undefined) {
    return null;
  }

  return (
    <Container style={{ width: "100%" }}>
      <Back to="/inference/models" />
      <Container row spaced>
        <Container row>
          <Image size={24} src={templateMatch.icon} />
          <Spacer inline x={1} />
          <Text size={21}>{templateMatch.displayName}</Text>
        </Container>
        <Link to={`/inference/new/${modelType}`}>
          <Button>
            <I size={14}>add</I>
            <Spacer inline x={0.5} />
            Deploy model
          </Button>
        </Link>
      </Container>
      <Spacer y={1} />
      <InfoSection text={templateMatch.description} />
      <Spacer y={1} />
      <Container row>
        {templateMatch.tags?.map((t) => (
          <>
            <Tag
              bottom="10px"
              left="12px"
              style={{ background: AddonTemplateTagColor[t] }}
              key={t}
            >
              {t}
            </Tag>
            {templateMatch.tags.indexOf(t) !==
              templateMatch.tags.length - 1 && <Spacer inline x={0.5} />}
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
