import React, { useContext, useMemo, useState } from "react";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Fieldset from "components/porter/Fieldset";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { type ClientDatastore } from "lib/databases/types";
import { useDatabaseList } from "lib/hooks/useDatabaseList";

import { Context } from "shared/Context";
import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import database from "assets/database.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import healthy from "assets/status-healthy.png";
import time from "assets/time.png";

import EngineTag from "./tags/EngineTag";

const DatabaseDashboard: React.FC = () => {
  const { currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { datastores, isLoading } = useDatabaseList();

  const filteredDatabases = useMemo(() => {
    const filteredBySearch = search(datastores, searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    return _.sortBy(filteredBySearch, ["name"]);
  }, [datastores, searchValue]);

  const renderContents = (): JSX.Element => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (datastores === undefined || isLoading) {
      return <Loading offset="-150px" />;
    }

    if (datastores.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No databases have been created yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by creating a database.</Text>
          <Spacer y={1} />
          <PorterLink to="/databases/new">
            <Button
              onClick={async () =>
                // TODO: add analytics
                true
              }
              height="35px"
              alt
            >
              Create database <Spacer inline x={1} />{" "}
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
          <SearchBar
            value={searchValue}
            setValue={(x) => {
              setSearchValue(x);
            }}
            placeholder="Search databases . . ."
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
          <PorterLink to="/databases/new">
            <Button
              onClick={async () =>
                // TODO: add analytics
                true
              }
              height="30px"
              width="140px"
            >
              <I className="material-icons">add</I> New database
            </Button>
          </PorterLink>
        </Container>
        <Spacer y={1} />

        {filteredDatabases.length === 0 ? (
          <Fieldset>
            <Container row>
              <PlaceholderIcon src={notFound} />
              <Text color="helper">No matching databases were found.</Text>
            </Container>
          </Fieldset>
        ) : isLoading ? (
          <Loading offset="-150px" />
        ) : view === "grid" ? (
          <GridList>
            {(filteredDatabases ?? []).map(
              (datastore: ClientDatastore, i: number) => {
                return (
                  <Link to={`/databases/${datastore.name}`} key={i}>
                    <Block>
                      <Container row spaced>
                        <Container row>
                          <Icon src={datastore.template.icon} />
                          <Text size={14}>{datastore.name}</Text>
                        </Container>
                        <MidIcon src={healthy} height="16px" />
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
          <List>
            {(filteredDatabases ?? []).map(
              (datastore: ClientDatastore, i: number) => {
                return (
                  <Row to={`/databases/${datastore.name}`} key={i}>
                    <Container row spaced>
                      <Container row>
                        <MidIcon src={datastore.template.icon} />
                        <Text size={14}>{datastore.name}</Text>
                      </Container>
                      <MidIcon src={healthy} height="16px" />
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
              }
            )}
          </List>
        )}
      </>
    );
  };

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={database}
        title="Databases"
        description="Storage, caches, and stateful workloads for this project."
        disableLineBreak
      />
      {renderContents()}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default DatabaseDashboard;

const MidIcon = styled.img<{ height?: string }>`
  height: ${(props) => props.height || "18px"};
  margin-right: 11px;
`;

const Row = styled(Link)<{ isAtBottom?: boolean }>`
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
