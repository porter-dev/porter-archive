import React, { useState } from "react";
import _ from "lodash";
import styled from "styled-components";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";

import database from "assets/database.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { SUPPORTED_DATABASE_TEMPLATES } from "./constants";
import DatabaseForm from "./forms/DatabaseForm";
import { type DatabaseTemplate } from "./types";

const CreateDatabase: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<
    DatabaseTemplate | undefined
  >(undefined);

  return (
    <StyledTemplateComponent>
      {match(selectedTemplate)
        .with(undefined, () => {
          return (
            <>
              <Back to="/databases" />
              <DashboardHeader
                image={database}
                title="Create a new database"
                capitalize={false}
                disableLineBreak
              />
              <Text size={15}>Production datastores</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Fully-managed production-ready datastores.
              </Text>
              <Spacer y={0.5} />
              <TemplateListWrapper>
                {SUPPORTED_DATABASE_TEMPLATES.map((template) => {
                  const { name, icon, description, disabled, engine } =
                    template;
                  return (
                    <TemplateBlock
                      disabled={disabled}
                      key={name}
                      onClick={() => {
                        !disabled && setSelectedTemplate(template);
                      }}
                    >
                      <TemplateHeader>
                        <Icon src={icon} />
                        <Spacer inline x={0.5} />
                        <TemplateTitle>{name}</TemplateTitle>
                        <Spacer inline x={0.5} />
                        <Tag hoverable={false}>{engine.displayName}</Tag>
                      </TemplateHeader>
                      <Spacer y={0.5} />
                      <TemplateDescription>{description}</TemplateDescription>
                      <Spacer y={0.5} />
                    </TemplateBlock>
                  );
                })}
              </TemplateListWrapper>
            </>
          );
        })
        .otherwise((tp) => (
          <DatabaseForm
            template={tp}
            onFormExit={() => {
              setSelectedTemplate(undefined);
            }}
          />
        ))}
    </StyledTemplateComponent>
  );
};

export default CreateDatabase;

const Icon = styled.img`
  height: 18px;
`;

const StyledTemplateComponent = styled.div`
  width: 100%;
  height: 100%;
`;

const TemplateDescription = styled.div`
  display: flex;
  margin-bottom: 15px;
  color: #ffffff66;
  font-weight: default;
  padding: 0px 50px;
  line-height: 1.4;
  font-size: 14px;
  text-align: center;
`;

const TemplateHeader = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 50px;
`;

const TemplateTitle = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  font-size: 22px;
  white-space: nowrap;
`;

const TemplateBlock = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  filter: ${({ disabled }) => (disabled ? "grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-size: 13px;
  flex-direction: column;
  align-item: center;
  height: 220px;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: ${(props) => (props.disabled ? "" : "1px solid #7a7b80")};
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
  display: grid;
  grid-column-gap: 30px;
  grid-row-gap: 30px;
  grid-template-columns: repeat(2, 1fr);
`;
