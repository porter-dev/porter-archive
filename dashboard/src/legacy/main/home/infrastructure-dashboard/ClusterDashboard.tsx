import React, { useContext, useMemo, useState } from "react";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import Fieldset from "components/porter/Fieldset";
import Icon from "components/porter/Icon";
import Image from "components/porter/Image";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import {
  CloudProviderAWS,
  CloudProviderAzure,
  CloudProviderGCP,
} from "lib/clusters/constants";
import { type ClientCluster } from "lib/clusters/types";
import { useClusterList } from "lib/hooks/useCluster";

import { Context } from "shared/Context";
import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import infra from "assets/cluster.svg";
import globe from "assets/globe.svg";
import grid from "assets/grid.png";
import infraGrad from "assets/infra-grad.svg";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import time from "assets/time.png";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";

const ClusterDashboard: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [providerFilter, setProviderFilter] = useState<
    "all" | "AWS" | "GCP" | "Azure"
  >("all");

  const { clusters, isLoading } = useClusterList();
  const { user, currentProject } = useContext(Context);

  const filteredClusters = useMemo(() => {
    const filteredBySearch = search(clusters, searchValue, {
      keys: ["name"],
      isCaseSensitive: false,
    });

    const sortedFilteredBySearch = _.sortBy(filteredBySearch, ["name"]);

    const filteredByProvider = sortedFilteredBySearch.filter(
      (cluster: ClientCluster) => {
        if (providerFilter === "all") {
          return true;
        }
        return cluster.cloud_provider.name === providerFilter;
      }
    );

    return filteredByProvider;
  }, [clusters, searchValue, providerFilter]);

  if (currentProject?.sandbox_enabled) {
    return (
      <StyledAppDashboard>
        <DashboardHeader
          image={infraGrad}
          title="Infrastructure"
          description="Clusters for running applications on this project."
          disableLineBreak
        />
        <DashboardPlaceholder>
          <Text size={16}>Infrastructure is not enabled on the Porter Cloud</Text>
          <Spacer y={0.5} />
          <Text color={"helper"}>
            Eject to your own cloud account to enable infrastructure.
          </Text>
          <Spacer y={1} />
          <PorterLink to="https://docs.porter.run/other/eject">
            <Button alt height="35px">
              Request ejection
            </Button>
          </PorterLink>
        </DashboardPlaceholder>
      </StyledAppDashboard>
    );
  }

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={infraGrad}
        title="Infrastructure"
        description="Clusters for running applications on this project."
        disableLineBreak
      />
      <Container row spaced>
        <Select
          options={[
            { value: "all", label: "All" },
            {
              value: "AWS",
              label: "AWS",
              icon: CloudProviderAWS.icon,
            },
            {
              value: "GCP",
              label: "GCP",
              icon: CloudProviderGCP.icon,
            },
            {
              value: "Azure",
              label: "Azure",
              icon: CloudProviderAzure.icon,
            },
          ]}
          value={providerFilter}
          setValue={(value) => {
            if (
              value === "all" ||
              value === "GCP" ||
              value === "AWS" ||
              value === "Azure"
            ) {
              setProviderFilter(value);
            }
          }}
          prefix={
            <Container row>
              <Image src={infra} size={15} opacity={0.6} />
              <Spacer inline width="20px" />
              Cloud
            </Container>
          }
        />
        <Spacer inline x={1} />
        <SearchBar
          value={searchValue}
          setValue={(x) => {
            setSearchValue(x);
          }}
          placeholder="Search clusters . . ."
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

        <Spacer inline x={1} />
        <PorterLink to="/infrastructure/new">
          <Button onClick={() => ({})} height="30px" width="130px">
            <I className="material-icons">add</I> New cluster
          </Button>
        </PorterLink>
      </Container>
      <Spacer y={1} />
      {isLoading ? (
        <Loading />
      ) : filteredClusters.length === 0 ? (
        <Fieldset>
          <Container row>
            <PlaceholderIcon src={notFound} />
            <Text color="helper">No matching clusters were found.</Text>
          </Container>
        </Fieldset>
      ) : view === "grid" ? (
        <GridList>
          {filteredClusters.map((cluster: ClientCluster, i: number) => {
            return (
              <Link to={`/infrastructure/${cluster.id}`} key={i}>
                <Block
                  clusterId={user.isPorterUser ? cluster.id.toString() : ""}
                >
                  <Container row>
                    <Icon src={cluster.cloud_provider.icon} height="18px" />
                    <Spacer inline width="11px" />
                    <Text size={14}>{cluster.vanity_name}</Text>
                  </Container>
                  {cluster.contract != null && (
                    <>
                      <Container row>
                        <Tag hoverable={false}>
                          <Container row>
                            <Icon src={globe} height="13px" />
                            <Spacer inline x={0.5} />
                            {cluster.contract.config.cluster.config?.region}
                          </Container>
                        </Tag>
                      </Container>
                      <Container row>
                        <StatusDot
                          status={
                            cluster.status === "READY" ? "available" : "pending"
                          }
                          heightPixels={8}
                        />
                        <Spacer inline x={0.5} />
                        <Text color="helper">
                          {cluster.status === "READY" ? "Running" : "Updating"}
                        </Text>
                        <Spacer inline x={1} />
                        <SmallIcon opacity="0.3" src={time} />
                        <Text size={13} color="#ffffff44">
                          {readableDate(cluster.contract.updated_at)}
                        </Text>
                      </Container>
                    </>
                  )}
                </Block>
              </Link>
            );
          })}
        </GridList>
      ) : (
        <ClusterList clusters={filteredClusters} />
      )}

      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

type ClusterListProps = {
  clusters: ClientCluster[];
};
export const ClusterList: React.FC<ClusterListProps> = ({ clusters }) => {
  return (
    <List>
      {clusters.map((cluster: ClientCluster, i: number) => {
        return (
          <Row to={`/infrastructure/${cluster.id}`} key={i}>
            <Container row spaced>
              <Container row>
                <MidIcon src={cluster.cloud_provider.icon} />
                <Text size={14}>{cluster.vanity_name}</Text>
              </Container>
              <Container row>
                <StatusDot
                  status={cluster.status === "READY" ? "available" : "pending"}
                  heightPixels={8}
                />
                <Spacer inline x={0.5} />
                <Text color="helper">
                  {cluster.status === "READY" ? "Running" : "Updating"}
                </Text>
              </Container>
            </Container>
            <Spacer y={0.5} />
            {cluster.contract != null && (
              <Container row>
                <Container row>
                  <SmallIcon opacity="0.3" src={globe} />
                  <Text size={13} color="#ffffff44">
                    {cluster.contract.config.cluster.config.region}
                  </Text>
                  <Spacer inline x={1} />
                  <SmallIcon opacity="0.3" src={time} />
                  <Text size={13} color="#ffffff44">
                    {readableDate(cluster.contract.updated_at)}
                  </Text>
                </Container>
              </Container>
            )}
          </Row>
        );
      })}
    </List>
  );
};

export default ClusterDashboard;

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
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const List = styled.div`
  overflow: hidden;
`;

const Block = styled.div<{ clusterId?: string }>`
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

    ::after {
      content: ${(props) =>
        !props.clusterId ? "''" : `"ID: ${props.clusterId}"`};
      position: absolute;
      top: 2px;
      right: 2px;
      background: ${(props) => props.clusterId && `#ffffff44`};
      opacity: 0.3;
      padding: 5px;
      border-radius: 4px;
      font-size: 12px;
    }
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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
  min-width: 300px;
  height: fit-content;
`;

const SmallIcon = styled.img<{ opacity?: string; height?: string }>`
  margin-left: 2px;
  height: ${(props) => props.height || "14px"};
  opacity: ${(props) => props.opacity || 1};
  filter: grayscale(100%);
  margin-right: 10px;
`;
