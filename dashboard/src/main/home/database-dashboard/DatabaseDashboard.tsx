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
import Image from "components/porter/Image";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Select from "components/porter/Select";
import ShowIntercomButton from "components/porter/ShowIntercomButton";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { isAWSCluster } from "lib/clusters/types";
import { type ClientDatastore } from "lib/databases/types";
import { useClusterList } from "lib/hooks/useCluster";
import { useDatastoreList } from "lib/hooks/useDatabaseList";

import { Context } from "shared/Context";
import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import engine from "assets/computer-chip.svg";
import databaseGrad from "assets/database-grad.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import time from "assets/time.png";

import { getDatastoreIcon, getEngineIcon } from "./icons";
import EngineTag from "./tags/EngineTag";

const DatabaseDashboard: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const { clusters, isLoading: isLoadingClusters } = useClusterList();

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | "RDS" | "ELASTICACHE">(
    "all"
  );
  const [engineFilter, setEngineFilter] = useState<
    "all" | "POSTGRES" | "AURORA-POSTGRES" | "REDIS"
  >("all");

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
        return datastore.type === typeFilter;
      }
    );

    const filteredByEngine = filteredByDatastoreType.filter(
      (datastore: ClientDatastore) => {
        if (engineFilter === "all") {
          return true;
        }
        return datastore.template.engine.name === engineFilter;
      }
    );

    return filteredByEngine;
  }, [datastores, searchValue, typeFilter, engineFilter]);

  const renderContents = (): JSX.Element => {
    if (currentProject?.sandbox_enabled) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>Datastores are coming soon for sandbox users</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            You can also eject to your own cloud account to start using managed
            datastores.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject">
            <Button alt height="35px">
              Request ejection
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      );
    }

    if (!currentProject?.db_enabled) {
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

    if (datastores === undefined || isLoading || isLoadingClusters) {
      return <Loading offset="-150px" />;
    }

    if (clusters.filter(isAWSCluster).length === 0) {
      return (
        <Fieldset>
          <Text size={16}>Datastores are not supported for this project.</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Datastores are only supported for projects with a provisioned AWS
            cluster.
          </Text>
          <Spacer y={0.5} />
          <Text color="helper">
            To get started with datastores, you will need to create an AWS
            cluster. Contact our team if you are interested in enabling
            multi-cluster support.
          </Text>
          <Spacer y={0.5} />
          <ShowIntercomButton
            message={`I would like to enable multi-cluster support for my project.`}
          />
        </Fieldset>
      );
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
                value: "RDS",
                label: "RDS",
                icon: getDatastoreIcon("RDS"),
              },
              {
                value: "ELASTICACHE",
                label: "Elasticache",
                icon: getDatastoreIcon("ELASTICACHE"),
              },
            ]}
            value={typeFilter}
            setValue={(value) => {
              if (
                value === "all" ||
                value === "RDS" ||
                value === "ELASTICACHE"
              ) {
                setTypeFilter(value);
                setEngineFilter("all");
              }
            }}
            prefix={
              <Container row>
                <Image src={databaseGrad} size={15} opacity={0.6} />
                <Spacer inline x={0.5} />
                Type
              </Container>
            }
          />
          <Spacer inline x={1} />
          <Select
            options={[
              { value: "all", label: "All" },
              {
                value: "POSTGRES",
                label: "PostgreSQL",
                icon: getEngineIcon("POSTGRES"),
              },
              {
                value: "AURORA-POSTGRES",
                label: "Aurora PostgreSQL",
                icon: getEngineIcon("POSTGRES"),
              },
              {
                value: "REDIS",
                label: "Redis",
                icon: getEngineIcon("REDIS"),
              },
            ]}
            value={engineFilter}
            setValue={(value) => {
              if (
                value === "all" ||
                value === "POSTGRES" ||
                value === "AURORA-POSTGRES" ||
                value === "REDIS"
              ) {
                setEngineFilter(value);
              }
            }}
            prefix={
              <Container row>
                <Image src={engine} size={15} opacity={0.6} />
                <Spacer inline x={0.5} />
                Engine
              </Container>
            }
          />
          <Spacer inline x={2} />
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
          <List>
            {(filteredDatastores ?? []).map(
              (datastore: ClientDatastore, i: number) => {
                return (
                  <Row to={`/datastores/${datastore.name}`} key={i}>
                    <Container row spaced>
                      <Container row>
                        <MidIcon src={datastore.template.icon} />
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
