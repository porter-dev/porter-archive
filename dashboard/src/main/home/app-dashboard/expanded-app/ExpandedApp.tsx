import React, { useEffect, useState, useContext, useCallback } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";
import { DeviconsNameList } from "assets/devicons-name-list";
import useAuth from "shared/auth/useAuth";
import yaml from "js-yaml";
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
import { ChartType, ResourceType } from "shared/types";
import RevisionSection from "main/home/cluster-dashboard/expanded-chart/RevisionSection";
import BuildSettingsTabStack from "./BuildSettingsTabStack";
import Button from "components/porter/Button";

type Props = RouteComponentProps & {};

const ExpandedApp: React.FC<Props> = ({ ...props }) => {
  const {
    currentCluster,
    currentProject,
    setCurrentError,
    setCurrentOverlay,
  } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthorized] = useAuth();
  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(true);
  const [imageIsPlaceholder, setImageIsPlaceholer] = useState<boolean>(false);

  const [tab, setTab] = useState("events");
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [components, setComponents] = useState<ResourceType[]>([]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAgentInstalled, setIsAgentInstalled] = useState<boolean>(false);
  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [newestImage, setNewestImage] = useState<string>(null);

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
  const updateComponents = async (currentChart: ChartType) => {
    setLoading(true);
    try {
      const res = await api.getChartComponents(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      );
      setComponents(res.data.Objects);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const getChartData = async (chart: ChartType) => {
    setIsLoadingChartData(true);
    const res = await api.getChart(
      "<token>",
      {},
      {
        name: chart.name,
        namespace: chart.namespace,
        cluster_id: currentCluster.id,
        revision: chart.version,
        id: currentProject.id,
      }
    );
    const image = res.data?.config?.image?.repository;
    const tag = res.data?.config?.image?.tag?.toString();
    const newNewestImage = tag ? image + ":" + tag : image;
    let imageIsPlaceholder = false;
    if (
      (image === "porterdev/hello-porter" ||
        image === "public.ecr.aws/o1j4x7p4/hello-porter") &&
      !newestImage
    ) {
      imageIsPlaceholder = true;
    }
    setImageIsPlaceholer(imageIsPlaceholder);
    setNewestImage(newNewestImage);

    const updatedChart = res.data;

    setAppData({ chart: updatedChart });

    updateComponents(updatedChart).finally(() => setIsLoadingChartData(false));
  };

  const setRevision = (chart: ChartType, isCurrent?: boolean) => {
    // // if we've set the revision, we also override the revision in log data
    // let newLogData = logData;

    // newLogData.revision = `${chart.version}`;

    // setLogData(newLogData);

    // setIsPreview(!isCurrent);
    getChartData(chart);
  };
  const appUpgradeVersion = useCallback(
    async (version: string, cb: () => void) => {
      // convert current values to yaml
      const values = appData.chart.config;

      const valuesYaml = yaml.dump({
        ...values,
      });

      setSaveValueStatus("loading");
      getChartData(appData.chart);

      try {
        await api.upgradeChartValues(
          "<token>",
          {
            values: valuesYaml,
            version: version,
            latest_revision: appData.chart.version,
          },
          {
            id: currentProject.id,
            namespace: appData.chart.namespace,
            name: appData.chart.name,
            cluster_id: currentCluster.id,
          }
        );
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics?.track("Chart Upgraded", {
          chart: appData.chart.name,
          values: valuesYaml,
        });

        cb && cb();
      } catch (err) {
        const parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        setSaveValueStatus(err);
        setCurrentError(parsedErr);

        window.analytics?.track("Failed to Upgrade Chart", {
          chart: appData.chart.name,
          values: valuesYaml,
          error: err,
        });
      }
    },
    [appData?.chart]
  );

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
        return (
          <BuildSettingsTabStack appData={appData} setAppData={setAppData} />
        );
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
          <Back to="/apps" />
          <HeaderWrapper>
            <TitleSectionStacks
              icon={
                appData.app?.build_packs &&
                renderIcon(appData.app?.build_packs) != ""
                  ? renderIcon(appData.app?.build_packs)
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
          <RevisionSection
            showRevisions={showRevisions}
            toggleShowRevisions={() => {
              setShowRevisions(!showRevisions);
            }}
            chart={appData.chart}
            refreshChart={() => getChartData(appData.chart)}
            setRevision={setRevision}
            forceRefreshRevisions={forceRefreshRevisions}
            refreshRevisionsOff={() => setForceRefreshRevisions(false)}
            shouldUpdate={
              appData.chart.latest_version &&
              appData.chart.latest_version !==
                appData.chart.chart.metadata.version
            }
            latestVersion={appData.chart.latest_version}
            upgradeVersion={appUpgradeVersion}
          />
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
