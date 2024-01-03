import React, { useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

import api from "shared/api";
import { Context } from "shared/Context";
import { search } from "shared/search";
import database from "assets/database.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import loading from "assets/loading.gif";
import notFound from "assets/not-found.png";
import healthy from "assets/status-healthy.png";

import { datastoreIcons } from "./icons";
import {
  cloudProviderListResponseValidator,
  datastoreListResponseValidator,
  type CloudProviderDatastore,
  type CloudProviderWithSource,
} from "./types";
import { datastoreField } from "./utils";

type Props = {
  projectId: number;
};

const DatabaseDashboard: React.FC<Props> = ({ projectId }) => {
  const { currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: cloudProviderResponse } = useQuery(
    ["cloudProviders", projectId],
    async () => {
      const response = await api.getAwsCloudProviders(
        "<token>",
        {},
        {
          project_id: projectId,
        }
      );

      const results = await cloudProviderListResponseValidator.parseAsync(
        response.data
      );
      return results;
    },
    {
      enabled: !!projectId,
    }
  );

  const cloudProviders = cloudProviderResponse?.accounts;

  const { data: datastores, isFetched: isLoaded } = useQuery(
    [projectId],
    async () => {
      if (cloudProviders === undefined) {
        return;
      }

      const results = await Promise.all(
        cloudProviders.map(
          async (
            cloudProvider: CloudProviderWithSource
          ): Promise<CloudProviderDatastore[]> => {
            const response = await api.getDatastores(
              "<token>",
              {},
              {
                project_id: cloudProvider.project_id,
                cloud_provider_name: "aws",
                cloud_provider_id: cloudProvider.cloud_provider_id,
                include_metadata: true,
              }
            );

            const results = await datastoreListResponseValidator.parseAsync(
              response.data
            );
            return results.datastores.map(
              (datastore): CloudProviderDatastore => {
                return {
                  cloud_provider_name: "aws",
                  cloud_provider_id: cloudProvider.cloud_provider_id,
                  datastore,
                  project_id: cloudProvider.project_id,
                };
              }
            );
          }
        )
      );

      if (results.length === 0) {
        return;
      }

      return results.flat(1);
    },
    {
      enabled: !!cloudProviders,
      refetchInterval: 10000,
      refetchOnWindowFocus: false,
    }
  );

  const filteredDatabases = useMemo(() => {
    const filteredBySearch = search(
      datastores === undefined ? [] : datastores,
      searchValue,
      {
        keys: ["name"],
        isCaseSensitive: false,
      }
    );

    return _.sortBy(filteredBySearch, ["name"]);
  }, [datastores, searchValue]);

  const renderStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case "available":
        return <StatusIcon src={healthy} />;
      case "":
        return <></>;
      case "error":
        return (
          <StatusText>
            <StatusWrapper success={false}>
              <Status src={loading} />
              {"Creating database"}
            </StatusWrapper>
          </StatusText>
        );
      case "updating":
        return (
          <StatusText>
            <StatusWrapper success={false}>
              <Status src={loading} />
              {"Creating database"}
            </StatusWrapper>
          </StatusText>
        );
      default:
        return <></>;
    }
  };

  const renderContents = (): JSX.Element => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (datastores === undefined || !isLoaded) {
      return <Loading offset="-150px" />;
    }

    if (datastores.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No databases have been created yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by creating a database.</Text>
          <Spacer y={1} />
          <PorterLink to="/databases/new/database">
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
          <PorterLink to="/databases/new/database">
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
        ) : !isLoaded ? (
          <Loading offset="-150px" />
        ) : view === "grid" ? (
          <GridList>
            {(filteredDatabases ?? []).map(
              (entry: CloudProviderDatastore, i: number) => {
                return (
                  <Link
                    to={`/databases/${entry.project_id}/${entry.cloud_provider_name}/${entry.cloud_provider_id}/${entry.datastore.name}/`}
                    key={i}
                  >
                    <Block>
                      <Container row>
                        <Icon
                          src={
                            datastoreIcons[entry.datastore.type] ||
                            entry.datastore.type
                          }
                        />
                        <Text size={14}>{entry.datastore.name}</Text>
                        <Spacer inline x={2} />
                      </Container>
                      {renderStatusIcon(
                        datastoreField(entry.datastore, "status")
                      )}
                      <Container row>
                        <Text size={13} color="#ffffff44">
                          {datastoreField(entry.datastore, "engine")}
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
              (entry: CloudProviderDatastore, i: number) => {
                return (
                  <Row
                    to={`/databases/${entry.project_id}/${entry.cloud_provider_name}/${entry.cloud_provider_id}/${entry.datastore.name}/`}
                    key={i}
                  >
                    <Container row>
                      <MidIcon
                        src={
                          datastoreIcons[entry.datastore.type] ||
                          entry.datastore.type
                        }
                      />
                      <Text size={14}>{entry.datastore.name}</Text>
                      <Spacer inline x={1} />
                      <MidIcon src={healthy} height="16px" />
                    </Container>
                    <Spacer height="15px" />
                    <Container row>
                      <Text size={13} color="#ffffff44">
                        {datastoreField(entry.datastore, "engine")}
                      </Text>
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

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
`;

const Icon = styled.img`
  height: 20px;
  margin-right: 13px;
`;

const Block = styled.div`
  height: 110px;
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

const StatusText = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusWrapper = styled.div<{
  success?: boolean;
}>`
  display: flex;
  line-height: 1.5;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-left: 15px;
  text-overflow: ellipsis;
  animation-fill-mode: forwards;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.success ? "#4797ff" : "#fcba03")};
  }
`;
const Status = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;
