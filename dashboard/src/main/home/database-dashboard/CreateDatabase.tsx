import React, { useMemo } from "react";
import _ from "lodash";
import { useHistory, useLocation, withRouter } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  DATASTORE_ENGINE_AURORA_POSTGRES,
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
  DATASTORE_TYPE_ELASTICACHE,
  DATASTORE_TYPE_RDS,
  type DatastoreTemplate,
} from "lib/databases/types";

import database from "assets/database.svg";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import { SUPPORTED_DATASTORE_TEMPLATES } from "./constants";
import DatabaseFormAuroraPostgres from "./forms/DatabaseFormAuroraPostgres";
import DatabaseFormElasticacheRedis from "./forms/DatabaseFormElasticacheRedis";
import DatabaseFormRDSPostgres from "./forms/DatabaseFormRDSPostgres";
import EngineTag from "./tags/EngineTag";

const CreateDatabase: React.FC = () => {
  const { search } = useLocation();
  const history = useHistory();
  const queryParams = new URLSearchParams(search);

  const templateMatch: DatastoreTemplate | undefined = useMemo(() => {
    return SUPPORTED_DATASTORE_TEMPLATES.find(
      (t) =>
        !t.disabled &&
        t.type.name === queryParams.get("type") &&
        t.engine.name === queryParams.get("engine")
    );
  }, [queryParams]);

  return (
    <StyledTemplateComponent>
      {match(templateMatch)
        .with(
          { type: DATASTORE_TYPE_RDS, engine: DATASTORE_ENGINE_POSTGRES },
          (t) => <DatabaseFormRDSPostgres template={t} />
        )
        .with(
          {
            type: DATASTORE_TYPE_RDS,
            engine: DATASTORE_ENGINE_AURORA_POSTGRES,
          },
          (t) => <DatabaseFormAuroraPostgres template={t} />
        )
        .with(
          { type: DATASTORE_TYPE_ELASTICACHE, engine: DATASTORE_ENGINE_REDIS },
          (t) => <DatabaseFormElasticacheRedis template={t} />
        )
        .otherwise(() => (
          <>
            <Back to="/datastores" />
            <DashboardHeader
              image={database}
              title="Create a new datastore"
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
              {SUPPORTED_DATASTORE_TEMPLATES.map((template) => {
                const { name, icon, description, disabled, engine, type } =
                  template;
                return (
                  <TemplateBlock
                    disabled={disabled}
                    key={`${name}-${engine.name}`}
                    onClick={() => {
                      const query = new URLSearchParams();
                      query.set("type", type.name);
                      query.set("engine", engine.name);
                      history.push(`/datastores/new?${query.toString()}`);
                    }}
                  >
                    <TemplateHeader>
                      <Icon src={icon} />
                      <Spacer inline x={0.5} />
                      <TemplateTitle>{name}</TemplateTitle>
                      <Spacer inline x={0.5} />
                    </TemplateHeader>
                    <Spacer y={0.5} />
                    <EngineTag engine={engine} />
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
