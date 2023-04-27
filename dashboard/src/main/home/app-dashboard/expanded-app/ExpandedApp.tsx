import React, { useEffect, useState, useContext } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import { DeviconsNameList } from "assets/devicons-name-list";

import api from "shared/api";
import { Context } from "shared/Context";

import notFound from "assets/not-found.png";

import Fieldset from "components/porter/Fieldset";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import Back from "components/porter/Back";
import TabSelector from "components/TabSelector";
import TitleSectionStacks from "components/TitleSectionStacks";
import DeploymentTypeStacks from "main/home/cluster-dashboard/expanded-chart/DeploymentTypeStacks";
import DeployStatusSection from "main/home/cluster-dashboard/expanded-chart/deploy-status-section/DeployStatusSection";
import { integrationList } from "shared/common";

type Props = RouteComponentProps & {};

const ExpandedApp: React.FC<Props> = ({ ...props }) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("events");
  const [isExpanded, setIsExpanded] = useState(false);

  const getPorterApp = async () => {
    setIsLoading(true);
    const { appName } = props.match.params as any;
    try {
      const resPorterApp = await api.getPorterApp(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          name: appName,
        }
      );
      console.log(resPorterApp);
      const resChartData = await api.getChart(
        "<token>",
        {},
        {
          id: currentProject.id,
          namespace: `porter-stack-${appName}`,
          cluster_id: currentCluster.id,
          name: appName,
          revision: 0,
        }
      );
      setAppData({
        app: resPorterApp?.data,
        chart: resChartData?.data,
      });
      console.log(resChartData?.data);
      console.log(resPorterApp?.data);
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };
  const renderIcon = (str: string) => {
    let value = str.split(",");
    let buildpack = value[0];
    // console.log(value);
    // value.forEach((buildpack) => {
    //   console.log(buildpack);
    const [languageName] = buildpack.split("/").reverse();
    const devicon = DeviconsNameList.find(
      (devicon) => languageName.toLowerCase() === devicon.name
    );
    if (devicon) {
      const icon = `devicon-${devicon?.name}-plain colored`;
      return icon;
    }
    // });
    return "";
  };

  useEffect(() => {
    const { appName } = props.match.params as any;
    if (currentCluster && appName && currentProject) {
      getPorterApp();
    }
  }, [currentCluster]);

  const getReadableDate = (s: string) => {
    const ts = new Date(s);
    const date = ts.toLocaleDateString();
    const time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };
  const renderTabContents = () => {
    switch (tab) {
      case "overview":
        return <div>TODO: service list</div>;
      case "build-settings":
        return <div>TODO: build settings</div>;
      case "settings":
        return <div>TODO: stack deletion</div>;
      default:
        return <div>dream on</div>;
    }
  };

  return (
    <StyledExpandedApp>
      {isLoading && <Loading />}
      {!appData && !isLoading && (
        <Placeholder>
          <Container row>
            <PlaceholderIcon src={notFound} />
            <Text color="helper">
              No application matching "{(props.match.params as any).appName}"
              was found.
            </Text>
          </Container>
          <Spacer y={1} />
          <Link to="/apps">Return to dashboard</Link>
        </Placeholder>
      )}
      {appData && (
        <>
          {/* <Container row>
            <Icon src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg" />
            <Text size={21}>{appData.name}</Text>
            <Spacer inline x={1} />
            <Text size={13}>repo: porter-dev/porter</Text>
            <Spacer inline x={1} />
            <Text size={13}>branch: main</Text>
          </Container> */}
          <HeaderWrapper>
            <TitleSectionStacks
              icon={
                appData.app.build_packs &&
                renderIcon(appData.app.build_packs) != ""
                  ? renderIcon(appData.app.build_packs)
                  : integrationList.registry.icon
              }
              iconWidth="33px"
            >
              {appData.chart.canonical_name === ""
                ? appData.chart.name
                : appData.chart.canonical_name}
              <DeploymentTypeStacks appData={appData} />
            </TitleSectionStacks>

            {/* {currentChart.chart.metadata.name != "worker" &&
              currentChart.chart.metadata.name != "job" &&
              renderUrl()} */}

            {/* //{currentChart.canonical_name !== "" && renderHelmReleaseName()} */}
            <InfoWrapper>
              {/*
                  <StatusIndicator
                    controllers={controllers}
                    status={currentChart.info.status}
                    margin_left={"0px"}
                  />
                  */}
              {/* <DeployStatusSection
                chart={appData.chart}
                setLogData={test}//renderLogsAtTimestamp}
              /> */}
              <LastDeployed>
                <Dot>•</Dot>Last deployed
                {" " + getReadableDate(appData.chart.info.last_deployed)}
              </LastDeployed>
            </InfoWrapper>
          </HeaderWrapper>
          <Spacer y={1} />
          <TabSelector
            options={[
              { label: "Events", value: "events" },
              { label: "Logs", value: "logs" },
              { label: "Metrics", value: "metrics" },
              { label: "Overview", value: "overview" },
              { label: "Build settings", value: "build-settings" },
              { label: "Settings", value: "settings" },
            ]}
            currentTab={tab}
            setCurrentTab={setTab}
          />
          <Spacer y={1} />
          {renderTabContents()}
        </>
      )}
    </StyledExpandedApp>
  );
};

export default withRouter(ExpandedApp);

const Icon = styled.img`
  height: 24px;
  margin-right: 15px;
`;

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;
const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 8px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;
const Dot = styled.div`
  margin-right: 16px;
`;
const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 3px;
  margin-top: 22px;
`;
