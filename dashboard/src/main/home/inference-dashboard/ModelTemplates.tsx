import React, { useContext, useMemo } from "react";
import { useHistory, useLocation } from "react-router";
import styled from "styled-components";

import Back from "components/porter/Back";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";

import inferenceGrad from "assets/inference-grad.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { models } from "./models";

const tagColor = {
  "text-to-text": "#3f51b5",
  "audio-to-text": "#0E7F5D",
  "text-to-image": "#D67400",
  "text-to-audio": "#7020C0",
  CPU: "#72747E",
  A100: "#f50057",
};

const ModelTemplates: React.FC = () => {
  const history = useHistory();

  return (
    <StyledTemplateComponent>
      <Back to="/inference" />
      <DashboardHeader
        image={inferenceGrad}
        title="Explore models"
        capitalize={false}
        description="Select a model to deploy on this project."
        disableLineBreak
      />
      <TemplateListWrapper>
        {Array.from(Object.keys(models)).map((id: string) => {
          const template = models[id];
          return (
            <TemplateBlock
              key={id}
              onClick={() => {
                history.push(`/inference/templates/${id}`);
              }}
            >
              <Icon src={template.icon} />
              <TemplateTitle>{template.name}</TemplateTitle>
              <TemplateDescription>{template.description}</TemplateDescription>
              <Spacer y={0.25} />
              <Container row>
                {template.tags?.map((t) => (
                  <Tag style={{ background: tagColor[t] }} key={t}>
                    {t}
                  </Tag>
                ))}
              </Container>
              <Spacer y={0.5} />
            </TemplateBlock>
          );
        })}
      </TemplateListWrapper>
    </StyledTemplateComponent>
  );
};

export default ModelTemplates;

const StyledTemplateComponent = styled.div`
  width: 100%;
  height: 100%;
`;

const Tag = styled.div<{ size?: string }>`
  font-size: 10px;
  margin-right: 10px;
  padding: 5px 10px;
  border-radius: 4px;
  opacity: 0.85;
`;

const TemplateDescription = styled.div`
  color: #ffffff66;
  text-align: center;
  font-weight: default;
  padding: 0px 25px;
  line-height: 1.4;
  font-size: 12px;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TemplateTitle = styled.div`
  width: 80%;
  text-align: center;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateBlock = styled.div`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 180px;
  cursor: pointer;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TemplateListWrapper = styled.div`
  overflow: visible;
  padding-bottom: 50px;
  display: grid;
  grid-column-gap: 30px;
  grid-row-gap: 30px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const Icon = styled.img`
  height: 25px;
  margin-top: 25px;
  margin-bottom: 5px;
`;
