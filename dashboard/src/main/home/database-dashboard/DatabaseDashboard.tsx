import _ from "lodash";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";

import calendar from "assets/calendar-number.svg";
import database from "assets/database.svg";
import grid from "assets/grid.png";
import list from "assets/list.png";
import notFound from "assets/not-found.png";
import healthy from "assets/status-healthy.png";
import time from "assets/time.png";
import letter from "assets/vector.svg";

import { Context } from "shared/Context";
import api from "shared/api";
import { hardcodedIcons } from "shared/hardcodedNameDict";
import { search } from "shared/search";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import PorterLink from "components/porter/Link";
import SearchBar from "components/porter/SearchBar";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Toggle from "components/porter/Toggle";
import { Link } from "react-router-dom";
import { readableDate } from "shared/string_utils";

import ClusterProvisioningPlaceholder from "components/ClusterProvisioningPlaceholder";
import DashboardPlaceholder from "components/porter/DashboardPlaceholder";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";

type Props = {};

const templateWhitelist = [
  "elasticache-redis",
  "rds-postgresql",
  "rds-postgresql-aurora",
];

const Apps: React.FC<Props> = ({ 
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"calendar" | "letter">("calendar");

  // Placeholder (replace w useQuery)
  const [databases, setDatabases] = useState([]);
  const [status, setStatus] = useState("");

  const filteredDatabases = useMemo(() => {
    const filteredBySearch = search(
      databases ?? [],
      searchValue,
      {
        keys: ["name", "chart.metadata.name"],
        isCaseSensitive: false,
      }
    );

    return _.sortBy(filteredBySearch);
  }, [databases, searchValue]);

  const getExpandedChartLinkURL = useCallback((x: any) => {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop: string) => searchParams.get(prop),
    });
    const cluster = currentCluster?.name;
    const route = `/applications/${cluster}/${x.namespace}/${x.name}`;
    const newParams = {
      // @ts-ignore
      project_id: params.project_id,
      closeChartRedirectUrl: '/databases',
    };
    const newURLSearchParams = new URLSearchParams(
      _.omitBy(newParams, _.isNil)
    );
    return `${route}?${newURLSearchParams.toString()}`;
  }, [currentCluster]);

  const getAddOns = async () => {
    try {
      setStatus("loading");
      const res = await api.getCharts(
        "<token>",
        {
          limit: 50,
          skip: 0,
          byDate: false,
          statusFilter: [
            "deployed",
            "uninstalled",
            "pending",
            "pending-install",
            "pending-upgrade",
            "pending-rollback",
            "failed",
          ],
        },
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
          namespace: "ack-system",
        }
      );
      setStatus("complete");
      const charts = res.data || [];
      const filtered = charts.filter((app: any) => {
        return (
          templateWhitelist.includes(app.chart.metadata.name)
        );
      });
      setDatabases(filtered);
    } catch (err) {
      setStatus("error");
    };
  };

  useEffect(() => {
    // currentCluster sometimes returns as -1 and passes null check
    if (currentProject?.id >= 0 && currentCluster?.id >= 0) {
      getAddOns();
    }
  }, [currentCluster, currentProject]);

  const renderContents = () => {
    if (currentCluster?.status === "UPDATING_UNAVAILABLE") {
      return <ClusterProvisioningPlaceholder />;
    }

    if (status === "loading") {
      return <Loading offset="-150px" />;
    }

    if (databases.length === 0) {
      return (
        <DashboardPlaceholder>
          <Text size={16}>No databases have been created yet</Text>
          <Spacer y={0.5} />

          <Text color={"helper"}>Get started by creating a database.</Text>
          <Spacer y={1} />
          <PorterLink to="/databases/new/database">
            <Button
              onClick={async () =>
                console.log() // TODO: add analytics
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
          <Spacer inline x={2} />
          <Toggle
            items={[
              { label: <ToggleIcon src={calendar} />, value: "calendar" },
              { label: <ToggleIcon src={letter} />, value: "letter" },
            ]}
            active={sort}
            setActive={(x) => {
              if (x === "calendar") {
                setSort("calendar");
              } else {
                setSort("letter");
              }
            }}
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
                console.log() // TODO: add analytics
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
        ) : (status === "loading" ? <Loading offset="-150px" /> : view === "grid" ? (
          <GridList>
            {(filteredDatabases ?? []).map((app: any, i: number) => {
              return (
                <Block to={getExpandedChartLinkURL(app)} key={i}>
                  <Container row>
                    <Icon
                      src={
                        hardcodedIcons[app.chart.metadata.name] ||
                        app.chart.metadata.icon
                      }
                    />
                    <Text size={14}>{app.name}</Text>
                    <Spacer inline x={2} />
                  </Container>
                  <StatusIcon src={healthy} />
                  <Container row>
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(app.info.last_deployed)}
                    </Text>
                  </Container>
                </Block>
              );
            })}
          </GridList>
        ) : (
          <List>
            {(filteredDatabases ?? []).map((app: any, i: number) => {
              return (
                <Row to={getExpandedChartLinkURL(app)} key={i}>
                  <Container row>
                    <MidIcon
                      src={
                        hardcodedIcons[app.chart.metadata.name] ||
                        app.chart.metadata.icon
                      }
                    />
                    <Text size={14}>{app.name}</Text>
                    <Spacer inline x={1} />
                    <MidIcon src={healthy} height="16px" />
                  </Container>
                  <Spacer height="15px" />
                  <Container row>
                    <SmallIcon opacity="0.4" src={time} />
                    <Text size={13} color="#ffffff44">
                      {readableDate(app.info.last_deployed)}
                    </Text>
                  </Container>
                </Row>
              );
            })}
          </List>
        )
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

export default Apps;

const MidIcon = styled.img<{ height?: string }>`
  height: ${props => props.height || "18px"};
  margin-right: 11px;
`;

const Row = styled(Link) <{ isAtBottom?: boolean }>`
  cursor: pointer;
  display: block;
  padding: 15px;
  border-bottom: ${props => props.isAtBottom ? "none" : "1px solid #494b4f"};
  background: ${props => props.theme.clickable.bg};
  position: relative;
  border: 1px solid #494b4f;
  border-radius: 5px;
  margin-bottom: 15px;
  animation: fadeIn 0.3s 0s;
`;

const List = styled.div`
  overflow: hidden;
`;

const SmallIcon = styled.img<{ opacity?: string }>`
  margin-left: 2px;
  height: 14px;
  opacity: ${props => props.opacity || 1};
  margin-right: 10px;
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

const Block = styled(Link)`
  height: 110px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
  color: ${props => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
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

const CentralContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: left;
`;
