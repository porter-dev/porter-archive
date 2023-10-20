import React, { useEffect, useState, useContext, useMemo } from "react";
import styled from "styled-components";
import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import semver from "semver";
import _ from "lodash";

import database from "assets/database.svg";
import notFound from "assets/not-found.png";
import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";

import { Context } from "shared/Context";
import api from "shared/api";
import { search } from "shared/search";

import TemplateList from "../launch/TemplateList";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Loading from "components/Loading";
import Back from "components/porter/Back";
import Fieldset from "components/porter/Fieldset";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import RDSForm from "./forms/RDSForm";
import AuroraPostgresForm from "./forms/AuroraPostgresForm";

type Props = {
};

const CreateDatabase: React.FC<Props> = ({
}) => {
  const { capabilities, currentProject, currentCluster, user } = useContext(Context);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [databaseTemplates, setDatabaseTemplates] = useState<any[]>([
    {
      id: "rds-postgresql",
      icon: awsRDS,
      name: "RDS PostgreSQL",
      description: "Amazon Relational Database Service (RDS) is a web service that makes it easier to set up, operate, and scale a relational database in the cloud.",
    },
    {
      id: "aurora-postgresql",
      icon: awsRDS,
      name: "Aurora PostgreSQL",
      description: "Amazon Aurora PostgreSQL is a fully managed, PostgreSQL–compatible, and ACID–compliant relational database engine that combines the speed, reliability, and manageability of Amazon Aurora with the simplicity and cost-effectiveness of open-source databases.",
    },
    {
      id: "elasticache-redis",
      icon: awsElastiCache,
      name: "ElastiCache Redis",
      description: "Contact support@porter.run.",
      disabled: true,
    },
    {
      id: "elasticache-memcached",
      icon: awsElastiCache,
      name: "ElastiCache Memcached",
      description: "Contact support@porter.run",
      disabled: true,
    },
  ]);
  
  const allFilteredTemplates = useMemo(() => {
    const filteredBySearch = search(
      databaseTemplates ?? [],
      searchValue,
      {
        keys: ["name"],
        isCaseSensitive: false,
      }
    );
    return _.sortBy(filteredBySearch);
  }, [databaseTemplates, searchValue]);

  return (
    <StyledTemplateComponent>
      {
        (currentTemplate) ? (
          <>
            {currentTemplate.id === "rds-postgresql" && (
              <RDSForm
                currentTemplate={currentTemplate}
                goBack={() => setCurrentTemplate(null)}
                repoURL={capabilities?.default_addon_helm_repo_url}
              />
            )}
            {currentTemplate.id === "aurora-postgresql" && (
              <AuroraPostgresForm
                currentTemplate={currentTemplate}
                goBack={() => setCurrentTemplate(null)}
                repoURL={capabilities?.default_addon_helm_repo_url}
              />
            )}
          </>
        ) : (
          <>
            <Back to="/databases" />
            <DashboardHeader
              image={database}
              title="Create a new database"
              capitalize={false}
              disableLineBreak
            />
            {/*
            <SearchBar
              value={searchValue}
              setValue={setSearchValue}
              placeholder="Search available databases . . ."
              width="100%"
            />
            <Spacer y={1} />
            */}

            {allFilteredTemplates.length === 0 && (
              <Fieldset>
                <Container row>
                  <PlaceholderIcon src={notFound} />
                  <Text color="helper">No matching add-ons were found.</Text>
                </Container>
              </Fieldset>
            )}
            <DarkMatter />

            {databaseTemplates?.length > 0 &&
              <>
                <Spacer y={1.5} />
                <Text size={15}>Production datastores</Text>
                <Spacer y={.5} />
                <Text color="helper">Fully-managed production-ready datastores.</Text>
                <Spacer y={.5} />
                <TemplateListWrapper>
                  {databaseTemplates.map((template) => {
                    let { id, name, icon, description, tags, disabled } = template;
                    return (
                      <TemplateBlock
                        disabled={disabled}
                        key={id}
                        onClick={() => {
                          !disabled && setCurrentTemplate(template);
                        }}
                      >
                        <Icon src={icon} />
                        <TemplateTitle>{name}</TemplateTitle>
                        <TemplateDescription>{description}</TemplateDescription>
                        <Spacer y={0.5} />
                      </TemplateBlock>
                    );
                  })}
                </TemplateListWrapper>
              </>
            }
          </>
        )
      }
    </StyledTemplateComponent >
  );
};

export default CreateDatabase;

const Icon = styled.img`
  height: 25px;
  margin-top: 30px;
  margin-bottom: 5px;
`;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -35px;
`;

const I = styled.i`
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
  border-radius: 50%;
  margin-right: 15px;
  background: ${props => props.theme.fg};
  color: ${props => props.theme.text.primary};
  border: 1px solid ${props => props.theme.border};
  :hover {
    filter: brightness(150%);
  }
`;

const StyledTemplateComponent = styled.div`
  width: 100%;
  height: 100%;
`;

const TemplateDescription = styled.div`
  margin-bottom: 15px;
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

const TemplateBlock = styled.div<{ disabled?: boolean }>`
  align-items: center;
  user-select: none;
  display: flex;
  filter: ${({ disabled }) => (disabled ? "grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-size: 13px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 180px;
  color: #ffffff;
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
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
  padding-bottom: 50px;
  display: grid;
  grid-column-gap: 30px;
  grid-row-gap: 30px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;