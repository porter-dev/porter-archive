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
  const DISPLAY_TAGS_MAP = {
    "ANALYITCS": { label: "Analytics", color: "#4cc9f0" },
    "SECURITY": { label: "Security", color: "#da1e37" },
    "DATA_STORE": { label: "Data Warehouse", color: "#7209b7" },
    "LOGGING": { label: "Logging", color: "#b5179e" }
    // You can add more here in the future as needed
  };
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
        <TitleContainer >
          <Icon src={hardcodedIcons[currentTemplate.name] || currentTemplate.icon} />

          <TitleContainer>
            <Text size={16}>
              <Capitalize>
                {hardcodedNames[currentTemplate.name] || currentTemplate.name}
              </Capitalize>
            </Text>
            <Text color={"helper"} size={12}>
              {currentTemplate.description}
            </Text>
          </TitleContainer>
        </TitleContainer>

        <Button onClick={() => proceed(form)}>
          <AddI className="material-icons">add</AddI>
          Deploy add-on
        </Button>
      </Container>
      {/* {Object.keys(DISPLAY_TAGS_MAP).map(tagKey => (
        currentTemplate.tags?.includes(tagKey) &&
        <Tag
          style={{ background: DISPLAY_TAGS_MAP[tagKey].color }}
        >
          {DISPLAY_TAGS_MAP[tagKey].label}
        </Tag>))} */}
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
  height: 46px;
  margin-right: 15px;
  border-radius: 10px;            
  background: ${(props) => props.theme.fg};
  padding: 10px;              
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
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

const Tag = styled.div<{ size?: string, right?: string, bottom?: string, left?: string }>`
  position: absolute;
  bottom: ${props => props.bottom || 'auto'};
  left: ${props => props.left || 'auto'};
  right: ${props => props.right || 'auto'};
  font-size: 10px;
  background: #480ca8;
  padding: 5px;
  margin-left: 2px;
  border-radius: 4px; 
  opacity: 0.7;
`;

const TitleContainer = styled.div`
display: flex;
flex-direction: row;
align-items: center;  /* This will vertically align the items in the center */
`;