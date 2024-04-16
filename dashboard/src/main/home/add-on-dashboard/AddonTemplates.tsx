import React, { useContext, useMemo } from "react";
import { useHistory, useLocation } from "react-router";
import styled from "styled-components";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";
import {
  AddonTemplateTagColor,
  SUPPORTED_ADDON_TEMPLATES,
  type AddonTemplate,
} from "lib/addons/template";

import { Context } from "shared/Context";
import addOnGrad from "assets/add-on-grad.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import AddonForm from "./AddonForm";
import AddonFormContextProvider from "./AddonFormContextProvider";

const AddonTemplates: React.FC = () => {
  const { currentProject } = useContext(Context);
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const history = useHistory();

  const templateMatch = useMemo(() => {
    const addonName = queryParams.get("addon_name");
    return SUPPORTED_ADDON_TEMPLATES.find((t) => t.type === addonName);
  }, [queryParams]);

  if (templateMatch) {
    return (
      <AddonFormContextProvider projectId={currentProject?.id} redirectOnSubmit>
        <AddonForm template={templateMatch} />
      </AddonFormContextProvider>
    );
  }

  return (
    <StyledTemplateComponent>
      <Back to="/addons" />
      <DashboardHeader
        image={addOnGrad}
        title="Create a new add-on"
        capitalize={false}
        description="Select an add-on to deploy to this project."
        disableLineBreak
      />
      <TemplateListWrapper>
        {SUPPORTED_ADDON_TEMPLATES.map((template: AddonTemplate) => {
          return (
            <TemplateBlock
              key={template.type}
              onClick={() => {
                history.push(`/addons/new?addon_name=${template.type}`);
              }}
            >
              <Icon src={template.icon} />
              <TemplateTitle>{template.displayName}</TemplateTitle>
              <TemplateDescription>{template.description}</TemplateDescription>
              <Spacer y={0.5} />
              {template.tags.map((t) => (
                <Tag
                  bottom="10px"
                  left="12px"
                  style={{ background: AddonTemplateTagColor[t] }}
                  key={t}
                >
                  {t}
                </Tag>
              ))}
            </TemplateBlock>
          );
        })}
      </TemplateListWrapper>
    </StyledTemplateComponent>
  );
};

export default AddonTemplates;

const StyledTemplateComponent = styled.div`
  width: 100%;
  height: 100%;
`;

const Tag = styled.div<{ size?: string; bottom?: string; left?: string }>`
  position: absolute;
  bottom: ${(props) => props.bottom || "auto"};
  left: ${(props) => props.left || "auto"};
  font-size: 10px;
  background: linear-gradient(
    45deg,
    rgba(88, 24, 219, 1) 0%,
    rgba(72, 12, 168, 1) 100%
  ); // added gradient for shiny effect
  padding: 10px;
  border-radius: 4px;
  opacity: 0.85;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
`;

const TemplateDescription = styled.div`
  margin-bottom: 26px;
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
  padding: 3px 0px 5px;
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
  margin-top: 15px;
  padding-bottom: 50px;
  display: grid;
  grid-column-gap: 30px;
  grid-row-gap: 30px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const Icon = styled.img`
  height: 25px;
  margin-top: 30px;
  margin-bottom: 5px;
`;
