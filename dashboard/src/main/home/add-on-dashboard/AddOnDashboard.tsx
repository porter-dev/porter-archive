import React, { 
  useEffect, 
  useState, 
  useContext, 
  useMemo, 
  useCallback 
} from "react";
import styled from "styled-components";
import _ from "lodash";

import addOn from "assets/add-ons.png";
import github from "assets/github.png";
import time from "assets/time.png";
import healthy from "assets/status-healthy.png";
import grid from "assets/grid.png";
import list from "assets/list.png";

import { Context } from "shared/Context";
import { search } from "shared/search";
import api from "shared/api";
import { hardcodedIcons } from "shared/hardcodedNameDict";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";

import Container from "components/porter/Container";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SearchBar from "components/porter/SearchBar";
import Toggle from "components/porter/Toggle";
import { readableDate } from "shared/string_utils";
import Loading from "components/Loading";
import { Link } from "react-router-dom";
import Fieldset from "components/porter/Fieldset";
import Select from "components/porter/Select";

type Props = {
};

const namespaceBlacklist = [
  "cert-manager",
  "ingress-nginx",
  "kube-node-lease",
  "kube-public",
  "kube-system",
  "monitoring",
];

const templateBlacklist = [
  "web",
  "worker",
  "job",
];

const AppDashboard: React.FC<Props> = ({
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [addOns, setAddOns] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);

  const filteredAddOns = useMemo(() => {
    const filteredBySearch = search(
      addOns ?? [],
      searchValue,
      {
        keys: ["name", "chart.metadata.name"],
        isCaseSensitive: false,
      }
    );

    return _.sortBy(filteredBySearch);
  }, [addOns, searchValue]);

  const getAddOns = async () => {
    try {
      setIsLoading(true);
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
          id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: "all",
        }
      );
      setIsLoading(false);
      const charts = res.data || [];
      setAddOns(charts);
    } catch (err) {
      setIsLoading(false);
    };
  };

  useEffect(() => {
    getAddOns();
  }, [currentCluster, currentProject]);

  const getExpandedChartLinkURL = useCallback((x: any) => {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop: string) => searchParams.get(prop),
    });
    const cluster = currentCluster?.name;
    const route = `/applications/${cluster}/${x.namespace}/${x.name}`;
    const newParams = {
      // @ts-ignore
      project_id: params.project_id,
      closeChartRedirectUrl: '/addons',
    };
    const newURLSearchParams = new URLSearchParams(
      _.omitBy(newParams, _.isNil)
    );
    return `${route}?${newURLSearchParams.toString()}`;
  }, [currentCluster]);

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={addOn}
        title="Add-ons"
        capitalize={false}
        description="Add-ons and supporting workloads for this project."
        disableLineBreak
      />
      <Container row spaced>
        <SearchBar 
          value={searchValue}
          setValue={setSearchValue}
          placeholder="Search add-ons . . ."
          width="100%"
        />
        <Spacer inline x={2} />
        <Toggle
          items={[
            { label: <ToggleIcon src={grid} />, value: "grid" },
            { label: <ToggleIcon src={list} />, value: "list" },
          ]}
          active={view}
          setActive={setView}
        />
        <Spacer inline x={2} />
        <Link to="/addons/new">
          <Button onClick={() => {}} height="30px" width="130px">
            <I className="material-icons">add</I> New add-on
          </Button>
        </Link>
      </Container>
      <Spacer y={1} />
      {isLoading ? <Loading offset="-150px" /> : view === "grid" ? (
        <GridList>
          {(filteredAddOns ?? []).map((app: any, i: number) => {
            if (
              !namespaceBlacklist.includes(app.namespace) && 
              !templateBlacklist.includes(app.chart.metadata.name)
            ) {
              return (
                <Block to={getExpandedChartLinkURL(app)}>
                  <Text size={14}>
                    <Icon 
                      src={
                        hardcodedIcons[app.chart.metadata.name] ||
                        app.chart.metadata.icon
                      }
                    />
                    {app.name}
                  </Text>
                  <StatusIcon src={healthy} />
                  <Text size={13} color="#ffffff44">
                    <SmallIcon opacity="0.4" src={time} />
                    {readableDate(app.info.last_deployed)}
                  </Text>
                </Block>
              );
            }
          })}
       </GridList>
      ) : (
        <List>
          {(filteredAddOns ?? []).map((app: any, i: number) => {
            if (
              !namespaceBlacklist.includes(app.namespace) &&
              !templateBlacklist.includes(app.chart.metadata.name)
            ) {
              return (
                <Row to={getExpandedChartLinkURL(app)}>
                  <Text size={14}>
                    <MidIcon
                      src={
                        hardcodedIcons[app.chart.metadata.name] ||
                        app.chart.metadata.icon
                      }
                    />
                    {app.name}
                    <Spacer inline x={1} />
                    <MidIcon src={healthy} height="16px" />
                  </Text>
                  <Spacer height="15px" />
                  <Text size={13} color="#ffffff44">
                    <SmallIcon opacity="0.4" src={time} />
                    {readableDate(app.info.last_deployed)}
                  </Text>
                </Row>
              );
            }
          })}
        </List>
      )}
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default AppDashboard;

const Row = styled(Link)<{ isAtBottom?: boolean }>`
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

const ToggleIcon = styled.img`
  height: 12px;
  margin: 0 5px;
  min-width: 12px;
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

const MidIcon = styled.img<{ height?: string }>`
  height: ${props => props.height || "18px"};
  margin-right: 11px;
`;

const SmallIcon = styled.img<{ opacity?: string }>`
  margin-left: 2px;
  height: 14px;
  opacity: ${props => props.opacity || 1};
  margin-right: 10px;
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