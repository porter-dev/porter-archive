import React, { useMemo } from "react";
import _ from "lodash";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";
import { z } from "zod";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import {
  DATABASE_ENGINE_AURORA_POSTGRES,
  DATABASE_ENGINE_POSTGRES,
  DATABASE_ENGINE_REDIS,
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
  type DatabaseTemplate,
} from "lib/databases/types";

import database from "assets/database.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { SUPPORTED_DATABASE_TEMPLATES } from "./constants";
import DatabaseFormAuroraPostgres from "./forms/DatabaseFormAuroraPostgres";
import DatabaseFormElasticacheRedis from "./forms/DatabaseFormElasticacheRedis";
import DatabaseFormRDSPostgres from "./forms/DatabaseFormRDSPostgres";

type Props = RouteComponentProps;
const CreateDatabase: React.FC<Props> = ({ history, match: queryMatch }) => {
  const templateMatch: DatabaseTemplate | undefined = useMemo(() => {
    const { params } = queryMatch;
    const validParams = z
      .object({
        type: z.string(),
        engine: z.string(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return undefined;
    }

    return SUPPORTED_DATABASE_TEMPLATES.find(
      (t) =>
        !t.disabled &&
        t.type === validParams.data.type &&
        t.engine.name === validParams.data.engine
    );
  }, [queryMatch]);

  return (
    <StyledTemplateComponent>
      {match(templateMatch)
        .with(
          { type: DATABASE_TYPE_RDS, engine: DATABASE_ENGINE_POSTGRES },
          (t) => <DatabaseFormRDSPostgres template={t} />
        )
        .with(
          { type: DATABASE_TYPE_RDS, engine: DATABASE_ENGINE_AURORA_POSTGRES },
          (t) => <DatabaseFormAuroraPostgres template={t} />
        )
        .with(
          { type: DATABASE_TYPE_ELASTICACHE, engine: DATABASE_ENGINE_REDIS },
          (t) => <DatabaseFormElasticacheRedis template={t} />
        )
        .otherwise(() => (
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
                const { name, icon, description, disabled, engine, type } =
                  template;
                return (
                  <TemplateBlock
                    disabled={disabled}
                    key={`${name}-${engine.name}`}
                    onClick={() => {
                      history.push(`/databases/new/${type}/${engine.name}`);
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
        ))}
    </StyledTemplateComponent>
  );
};

export default withRouter(CreateDatabase);

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
