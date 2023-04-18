import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import _ from "lodash";

import { Context } from "shared/Context";
import api from "shared/api";

import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Text from "components/porter/Text";
import Markdown from "markdown-to-jsx";

import { hardcodedNames, hardcodedIcons } from "shared/hardcodedNameDict";

type Props = {
  currentTemplate: any;
  proceed: (form?: any) => void;
  goBack: () => void;
};

const ExpandedTemplate: React.FC<Props> = ({
  currentTemplate,
  proceed,
  goBack,
}) => {
  const { capabilities, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [form, setForm] = useState<any>(null);
  const [values, setValues] = useState("");
  const [markdown, setMarkdown] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);

  const getTemplateInfo = async () => {
    setIsLoading(true);
    let params = {
      repo_url: capabilities?.default_addon_helm_repo_url,
    };

    api.getTemplateInfo("<token>", params, {
      project_id: currentProject.id,
      name: currentTemplate.name.toLowerCase().trim(),
      version: currentTemplate.currentVersion,
    })
      .then((res) => {
        let { form, values, markdown, metadata } = res.data;
        let keywords = metadata.keywords;
        setForm(form);
        setValues(values);
        setMarkdown(markdown);
        setKeywords(keywords);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    getTemplateInfo();
  }, [currentTemplate]);

  return (
    <StyledExpandedTemplate>
      <Container row spaced>
        <Container row>
          <Button 
            onClick={goBack}
            alt
          >
            <I className="material-icons">first_page</I>
            <Spacer inline x={1} />
            Select template
          </Button>
          <Spacer x={1} inline />
          <Icon src={hardcodedIcons[currentTemplate.name] || currentTemplate.icon} />
          <Text size={16}>
            <Capitalize>
              {hardcodedNames[currentTemplate.name] || currentTemplate.name}
            </Capitalize>
          </Text>
        </Container>
        <Button onClick={() => proceed(form)}>
          <AddI className="material-icons">add</AddI>
          Deploy add-on
        </Button>
      </Container>
      <Spacer height="15px" />
      {
        isLoading ? <Loading offset="-150px" /> : (
          markdown ? (
            <MarkdownWrapper>
              <Markdown>{markdown}</Markdown>
            </MarkdownWrapper>
          ) : (
            <>
              <Spacer y={0.5} />
              <Text>{currentTemplate.description}</Text>
            </>
          )
        )
      }
    </StyledExpandedTemplate>
  );
};

export default ExpandedTemplate;

const MarkdownWrapper = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: #aaaabb;
  > div {
    > h1 {
      color: ${({ theme }) => theme.text.primary};
      font-size: 16px;
      font-weight: 400;
    }
    > h2 {
      color: ${({ theme }) => theme.text.primary};
      font-size: 16px;
      font-weight: 400;
    }
    > h3 {
      color: ${({ theme }) => theme.text.primary};
      font-size: 16px;
      font-weight: 400;
    }
  }
  padding-bottom: 80px;
`;

const Icon = styled.img`
  height: 22px;
  margin-right: 15px;
`;

const Capitalize = styled.span`
  text-transform: capitalize;
`;

const I = styled.i`
  color: white;
  font-size: 16px;
`;

const AddI = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 10px;
  justify-content: center;
`;

const StyledExpandedTemplate = styled.div`
  width: 100%;
  height: 100%;
`;