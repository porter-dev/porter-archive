import React, { useContext, useMemo, useState } from "react";
import databaseGrad from "legacy/assets/database-grad.svg";
import grid from "legacy/assets/grid.png";
import list from "legacy/assets/list.png";
import notFound from "legacy/assets/not-found.png";
import time from "legacy/assets/time.png";
import ClusterProvisioningPlaceholder from "legacy/components/ClusterProvisioningPlaceholder";
import Loading from "legacy/components/Loading";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import DashboardPlaceholder from "legacy/components/porter/DashboardPlaceholder";
import Fieldset from "legacy/components/porter/Fieldset";
import Image from "legacy/components/porter/Image";
import PorterLink from "legacy/components/porter/Link";
import SearchBar from "legacy/components/porter/SearchBar";
import Select from "legacy/components/porter/Select";
import ShowIntercomButton from "legacy/components/porter/ShowIntercomButton";
import Spacer from "legacy/components/porter/Spacer";
import StatusDot from "legacy/components/porter/StatusDot";
import Text from "legacy/components/porter/Text";
import Toggle from "legacy/components/porter/Toggle";
import { type ClientDatastore } from "legacy/lib/databases/types";
import { useDatastoreList } from "legacy/lib/hooks/useDatabaseList";
import { search } from "legacy/shared/search";
import { readableDate } from "legacy/shared/string_utils";
import _ from "lodash";
import { Link, useHistory } from "react-router-dom";
import styled from "styled-components";

import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import { Context } from "shared/Context";

import { DATASTORE_ENGINE_POSTGRES, DATASTORE_ENGINE_REDIS } from "./constants";
import EngineTag from "./tags/EngineTag";

const DatabaseDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | "POSTGRES" | "REDIS">(
    "all"
  );
  const history = useHistory();

  const { datastores, isLoading } = useDatastoreList({
    refetchIntervalMilliseconds: 5000,
  });

  const filteredDatastores = useMemo(() => {
    const filteredBySearch = search(datastores, searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    const sortedFilteredBySearch = _.sortBy(filteredBySearch, ["name"]);

    const filteredByDatastoreType = sortedFilteredBySearch.filter(
      (datastore: ClientDatastore) => {
        if (typeFilter === "all") {
          return true;
        }
        return datastore.template.highLevelType.name === typeFilter;
      }
    );

    return filteredByDatastoreType;
  }, [datastores, searchValue, typeFilter]);

  const renderContents = (): JSX.Element => {
    if (!currentProject?.sandbox_enabled && !currentProject?.db_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>Datastores are not enabled for this project</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Reach out to the Porter team to enable managed datastores on your
            project.
          </Text>
          <Spacer y={1} />
          <ShowIntercomButton
            alt
            message="I would like to enable managed datastores on my project"
            height="35px"
          >
            Request to enable
          </ShowIntercomButton>
        </DashboardPlaceholder>
      );
    }

    if (datastores === undefined || isLoading) {
      return <Loading offset="-150px" />;
    }

    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (datastores.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No datastores have been created yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by creating a datastore.</Text>
          <Spacer y={1} />
          <PorterLink to="/datastores/new">
            <Button onClick={() => ({})} height="35px" alt>
              Create a new datastore <Spacer inline x={1} />{" "}
              <i className="material-icons" style={{ fontSize: "18px" }}>
                east
              </i>
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    }

    return (
      <>
        <Container row spaced>
          <Select
            options={[
              { value: "all", label: "All" },
              {
                value: "POSTGRES",
                label: "Postgres",
                icon: DATASTORE_ENGINE_POSTGRES.icon,
              },
              {
                value: "REDIS",
                label: "Redis",
                icon: DATASTORE_ENGINE_REDIS.icon,
              },
            ]}
            value={typeFilter}
            setValue={(value) => {
              if (
                value === "all" ||
                value === "POSTGRES" ||
                value === "REDIS"
              ) {
                setTypeFilter(value);
              }
            }}
            prefix={
              <Container row>
                <Image src={databaseGrad} size={15} opacity={0.6} />
                <Spacer inline x={0.5} />
                Type
              </Container>
            }
            width="350px"
          />
          <Spacer inline x={1} />
          <SearchBar
            value={searchValue}
            setValue={(x) => {
              setSearchValue(x);
            }}
            placeholder="Search datastores . . ."
            width="100%"
          />
          <Spacer inline x={1} />

          <Toggle
            items={[
              { label: <ToggleIcon src={grid} />, value: "grid" },
              { label: <ToggleIcon src={list} />, value: "list" },
            ]}
            active={view}
            setActive={(x) => {
              if (x === "grid") {
                setView("grid");
              } else {
                setView("list");
              }
            }}
          />

          <Spacer inline x={2} />
          <PorterLink to="/datastores/new">
            <Button onClick={() => ({})} height="30px" width="70px">
              <I className="material-icons">add</I> New
            </Button>
          </PorterLink>
        </Container>
        <Spacer y={1} />

        {filteredDatastores.length === 0 ? (
          <Fieldset>
            <Container row>
              <PlaceholderIcon src={notFound} />
              <Text color="helper">No matching datastores were found.</Text>
            </Container>
          </Fieldset>
        ) : isLoading ? (
          <Loading offset="-150px" />
        ) : view === "grid" ? (
          <GridList>
            {(filteredDatastores ?? []).map(
              (datastore: ClientDatastore, i: number) => {
                return (
                  <Link to={`/datastores/${datastore.name}`} key={i}>
                    <Block>
                      <Container row spaced>
                        <Container row>
                          <Icon src={datastore.template.icon} />
                          <Text size={14}>{datastore.name}</Text>
                        </Container>
                        <StatusDot
                          status={
                            datastore.status === "AVAILABLE"
                              ? "available"
                              : "pending"
                          }
                          heightPixels={9}
                        />
                      </Container>
                      <Container row>
                        <EngineTag engine={datastore.template.engine} />
                      </Container>
                      <Container row>
                        <SmallIcon opacity="0.4" src={time} />
                        <Text size={13} color="#ffffff44">
                          {readableDate(datastore.created_at)}
                        </Text>
                      </Container>
                    </Block>
                  </Link>
                );
              }
            )}
          </GridList>
        ) : (
          <DatastoreList
            datastores={filteredDatastores}
            onClick={(d: ClientDatastore) => {
              history.push(`/datastores/${d.name}`);
            }}
          />
        )}
      </>
    );
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={databaseGrad}
        title="Datastores"
        description="Storage, caches, and stateful workloads for this project."
        disableLineBreak
      />
      {renderContents()}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default DatabaseDashboard;

export const DatastoreList: React.FC<{
  datastores: ClientDatastore[];
  onClick: (datastore: ClientDatastore) => void | Promise<void>;
}> = ({ datastores, onClick }) => {
  return (
    <List>
      {datastores.map((datastore: ClientDatastore, i: number) => {
        return (
          <Row
            key={i}
            onClick={() => {
              void onClick(datastore);
            }}
          >
            <Container row spaced>
              <Container row>
                <MidIcon src={datastore.template.icon} />
                <Text size={14}>{datastore.name}</Text>
              </Container>
              <StatusDot
                status={
                  datastore.status === "AVAILABLE" ? "available" : "pending"
                }
                heightPixels={9}
              />
            </Container>
            <Spacer y={0.5} />
            <Container row>
              <EngineTag engine={datastore.template.engine} />
              <Spacer inline x={1} />
              <Container>
                <SmallIcon opacity="0.4" src={time} />
                <Text size={13} color="#ffffff44">
                  {readableDate(datastore.created_at)}
                </Text>
              </Container>
            </Container>
          </Row>
        );
      })}
    </List>
  );
};

const MidIcon = styled.img<{ height?: string }>`
  height: ${(props) => props.height || "18px"};
  margin-right: 11px;
`;

const Row = styled.div<{ isAtBottom?: boolean }>`
  cursor: pointer;
  display: block;
  padding: 15px;
  border-bottom: ${(props) =>
    props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${(props) => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const List = styled.div`
  overflow: hidden;
`;

const Icon = styled.img`
  height: 20px;
  margin-right: 13px;
`;

const Block = styled.div`
  height: 150px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${(props) => props.theme.text.primary};
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

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
`;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
