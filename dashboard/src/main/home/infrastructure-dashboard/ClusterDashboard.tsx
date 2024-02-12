import React, { useMemo, useState } from "react";
import _ from "lodash";
import { Link } from "react-router-dom";
import styled from "styled-components";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
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

import { search } from "shared/search";
import { readableDate } from "shared/string_utils";
import infra from "assets/cluster.svg";
import globe from "assets/globe.svg";
import grid from "assets/grid.png";
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

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={infra}
        title="Clusters"
        description="Clusters for this project."
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
              <Spacer inline x={0.5} />
              Cloud
            </Container>
          }
        />
        <Spacer inline x={2} />
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

        {/* <Spacer inline x={2} />
        <PorterLink to="/infrastructure/new">
          <Button onClick={() => ({})} height="30px" width="70px">
            <I className="material-icons">add</I> New
          </Button>
        </PorterLink> */}
      </Container>
      <Spacer y={1} />

      {filteredClusters.length === 0 ? (
        <Fieldset>
          <Container row>
            <PlaceholderIcon src={notFound} />
            <Text color="helper">No matching clusters were found.</Text>
          </Container>
        </Fieldset>
      ) : isLoading ? (
        <Loading offset="-150px" />
      ) : view === "grid" ? (
        <GridList>
          {filteredClusters.map((cluster: ClientCluster, i: number) => {
            return (
              <Link to={`/infrastructure/${cluster.id}`} key={i}>
                <Block>
                  <Container row spaced>
                    <Container row>
                      <Icon src={cluster.cloud_provider.icon} />
                      <Text size={14}>{cluster.vanity_name}</Text>
                    </Container>
                    <StatusDot
                      status={
                        cluster.status === "READY" ? "available" : "pending"
                      }
                      heightPixels={9}
                    />
                  </Container>
                  <Container row>
                    <Tag hoverable={false}>
                      <Icon src={globe} height={"11px"} />
                      {cluster.contract.config.cluster.config?.region}
                    </Tag>
                  </Container>
                  <Container row>
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(cluster.contract.updated_at)}
                    </Text>
                  </Container>
                </Block>
              </Link>
            );
          })}
        </GridList>
      ) : (
        <List>
          {filteredClusters.map((cluster: ClientCluster, i: number) => {
            return (
              <Row to={`/infrastructure/${cluster.id}`} key={i}>
                <Container row spaced>
                  <Container row>
                    <MidIcon src={cluster.cloud_provider.icon} />
                    <Text size={14}>{cluster.vanity_name}</Text>
                  </Container>
                  <StatusDot
                    status={
                      cluster.status === "READY" ? "available" : "pending"
                    }
                    heightPixels={9}
                  />
                </Container>
                <Spacer y={0.5} />
                <Container row>
                  <Container row>
                    <Text size={13} color="#ffffff44">
                      {cluster.contract.config.cluster.config.region}
                    </Text>
                    <Spacer inline x={1} />
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(cluster.contract.updated_at)}
                    </Text>
                  </Container>
                </Container>
              </Row>
            );
          })}
        </List>
      )}

      <Spacer y={5} />
    </StyledAppDashboard>
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
