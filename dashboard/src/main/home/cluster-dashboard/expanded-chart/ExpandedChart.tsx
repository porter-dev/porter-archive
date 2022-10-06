import React, { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import yaml from "js-yaml";
import _, { cloneDeep } from "lodash";
import loadingSrc from "assets/loading.gif";
import leftArrow from "assets/left-arrow.svg";

import { ChartType, ClusterType, ResourceType } from "shared/types";
import { Context } from "shared/Context";
import api from "shared/api";
import StatusIndicator from "components/StatusIndicator";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import RevisionSection from "./RevisionSection";
import ValuesYaml from "./ValuesYaml";
import GraphSection from "./GraphSection";
import MetricsSection from "./metrics/MetricsSection";
import ListSection from "./ListSection";
import StatusSection from "./status/StatusSection";
import SettingsSection from "./SettingsSection";
import Loading from "components/Loading";
import { useWebsockets } from "shared/hooks/useWebsockets";
import useAuth from "shared/auth/useAuth";
import TitleSection from "components/TitleSection";
import DeploymentType from "./DeploymentType";
import IncidentsTab from "./incidents/IncidentsTab";
import BuildSettingsTab from "./build-settings/BuildSettingsTab";
import { DisabledNamespacesForIncidents } from "./incidents/DisabledNamespaces";
import { useStackEnvGroups } from "./useStackEnvGroups";

type Props = {
  namespace: string;
  currentChart: ChartType;
  currentCluster: ClusterType;
  closeChart: () => void;
  setSidebar: (x: boolean) => void;
  isMetricsInstalled: boolean;
};

const getReadableDate = (s: string) => {
  let ts = new Date(s);
  let date = ts.toLocaleDateString();
  let time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

const ExpandedChart: React.FC<Props> = (props) => {
  const [currentChart, setCurrentChart] = useState<ChartType>(
    props.currentChart
  );
  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [components, setComponents] = useState<ResourceType[]>([]);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [devOpsMode, setDevOpsMode] = useState<boolean>(
    localStorage.getItem("devOpsMode") === "true"
  );
  const [rightTabOptions, setRightTabOptions] = useState<any[]>([]);
  const [leftTabOptions, setLeftTabOptions] = useState<any[]>([]);
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );
  const [controllers, setControllers] = useState<
    Record<string, Record<string, any>>
  >({});
  const [url, setUrl] = useState<string>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [imageIsPlaceholder, setImageIsPlaceholer] = useState<boolean>(false);
  const [newestImage, setNewestImage] = useState<string>(null);
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(true);
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);
  const [isAuthorized] = useAuth();
  const [fullScreenLogs, setFullScreenLogs] = useState<boolean>(false);

  const {
    isStack,
    stackEnvGroups,
    isLoadingStackEnvGroups,
  } = useStackEnvGroups(currentChart);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const {
    currentCluster,
    currentProject,
    setCurrentError,
    setCurrentOverlay,
  } = useContext(Context);

  // Retrieve full chart data (includes form and values)
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

    setCurrentChart(updatedChart);

    updateComponents(updatedChart).finally(() => setIsLoadingChartData(false));
  };

  const getControllers = async (chart: ChartType) => {
    // don't retrieve controllers for chart that failed to even deploy.
    if (chart.info.status == "failed") return;

    try {
      const { data: chartControllers } = await api.getChartControllers(
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

      chartControllers.forEach((c: any) => {
        c.metadata.kind = c.kind;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [c.metadata.uid]: c,
        }));
      });

      return;
    } catch (error) {
      if (typeof error !== "string") {
        setCurrentError(JSON.stringify(error));
      }
      setCurrentError(error);
    }
  };

  const setupWebsocket = (kind: string) => {
    const apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/${kind}/status`;

    const wsConfig = {
      onmessage(evt: MessageEvent) {
        const event = JSON.parse(evt.data);
        let object = event.Object;
        object.metadata.kind = event.Kind;

        if (event.event_type != "UPDATE") {
          return;
        }

        setControllers((oldControllers) => {
          if (
            oldControllers &&
            oldControllers[object.metadata.uid]?.status?.conditions ==
              object.status?.conditions
          ) {
            return oldControllers;
          }
          return {
            ...oldControllers,
            [object.metadata.uid]: object,
          };
        });
      },
      onerror() {
        closeWebsocket(kind);
      },
    };

    newWebsocket(kind, apiEndpoint, wsConfig);
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

  const onSubmit = async (props: any) => {
    const rawValues = props.values;

    // Convert dotted keys to nested objects
    let values: any = {};

    // Weave in preexisting values and convert to yaml
    if (props?.currentChart?.config) {
      values = props.currentChart.config;
    }

    // Override config from currentChart prop if we have it on the current state
    if (currentChart.config) {
      values = currentChart.config;
    }

    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let valuesYaml = yaml.dump({
      ...values,
    });

    const syncedEnvGroups = props?.metadata
      ? props?.metadata["container.env"]
      : {};

    const deletedEnvGroups = syncedEnvGroups?.deleted || [];

    const addedEnvGroups = syncedEnvGroups?.added || [];

    const addApplicationToEnvGroupPromises = addedEnvGroups.map(
      (envGroup: any) => {
        return api.addApplicationToEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: currentChart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: currentChart.namespace,
          }
        );
      }
    );

    try {
      await Promise.all(addApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't sync the env group to the application, please try again."
      );
    }

    const removeApplicationToEnvGroupPromises = deletedEnvGroups.map(
      (envGroup: any) => {
        return api.removeApplicationFromEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: currentChart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: currentChart.namespace,
          }
        );
      }
    );
    try {
      await Promise.all(removeApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't remove the synced env group from the application, please try again."
      );
    }

    setSaveValueStatus("loading");

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values: valuesYaml,
          // this is triggered from the Porter form, so we set the latest revision to ensure that the release is
          // up to date
          latest_revision: currentChart.version,
        },
        {
          id: currentProject.id,
          namespace: currentChart.namespace,
          name: currentChart.name,
          cluster_id: currentCluster.id,
        }
      );

      getChartData(currentChart);

      setSaveValueStatus("successful");
      setForceRefreshRevisions(true);

      window.analytics?.track("Chart Upgraded", {
        chart: currentChart.name,
        values: valuesYaml,
      });
    } catch (err) {
      const parsedErr = err?.response?.data?.error;

      if (parsedErr) {
        err = parsedErr;
      }

      setSaveValueStatus("The api answered with an error");

      setCurrentError(JSON.stringify(parsedErr));

      window.analytics?.track("Failed to Upgrade Chart", {
        chart: currentChart.name,
        values: valuesYaml,
        error: err,
      });

      return;
    }
  };

  const handleUpgradeVersion = useCallback(
    async (version: string, cb: () => void) => {
      // convert current values to yaml
      let values = currentChart.config;

      let valuesYaml = yaml.dump({
        ...values,
      });

      setSaveValueStatus("loading");
      getChartData(currentChart);

      try {
        await api.upgradeChartValues(
          "<token>",
          {
            values: valuesYaml,
            version: version,
            latest_revision: currentChart.version,
          },
          {
            id: currentProject.id,
            namespace: currentChart.namespace,
            name: currentChart.name,
            cluster_id: currentCluster.id,
          }
        );
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics?.track("Chart Upgraded", {
          chart: currentChart.name,
          values: valuesYaml,
        });

        cb && cb();
      } catch (err) {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        setSaveValueStatus(err);
        setCurrentError(parsedErr);

        window.analytics?.track("Failed to Upgrade Chart", {
          chart: currentChart.name,
          values: valuesYaml,
          error: err,
        });
      }
    },
    [currentChart]
  );

  const renderTabContents = (currentTab: string) => {
    let { setSidebar } = props;
    let chart = currentChart;
    switch (currentTab) {
      case "metrics":
        return <MetricsSection currentChart={chart} />;
      case "incidents":
        if (DisabledNamespacesForIncidents.includes(currentChart.namespace)) {
          return null;
        }
        return (
          <IncidentsTab
            releaseName={chart?.name}
            namespace={chart?.namespace}
          />
        );
      case "status":
        if (isLoadingChartData) {
          return (
            <Placeholder>
              <Loading />
            </Placeholder>
          );
        }
        if (imageIsPlaceholder) {
          return (
            <Placeholder>
              <TextWrap>
                <Header>
                  <Spinner src={loadingSrc} /> This application is currently
                  being deployed
                </Header>
                Navigate to the{" "}
                <A
                  href={
                    props.currentChart.git_action_config &&
                    `https://github.com/${props.currentChart.git_action_config?.git_repo}/actions`
                  }
                  target={"_blank"}
                >
                  Actions
                </A>{" "}
                tab of your GitHub repo to view live build logs.
              </TextWrap>
            </Placeholder>
          );
        } else {
          return (
            <StatusSection
              currentChart={chart}
              setFullScreenLogs={() => setFullScreenLogs(true)}
            />
          );
        }
      case "settings":
        return (
          <SettingsSection
            currentChart={chart}
            refreshChart={() => getChartData(currentChart)}
            setShowDeleteOverlay={(x: boolean) => {
              if (x) {
                setCurrentOverlay({
                  message: `Are you sure you want to delete ${currentChart.name}?`,
                  onYes: handleUninstallChart,
                  onNo: () => setCurrentOverlay(null),
                });
              } else {
                setCurrentOverlay(null);
              }
            }}
          />
        );
      case "graph":
        return (
          <GraphSection
            components={components}
            currentChart={chart}
            setSidebar={setSidebar}
            // Handle resize YAML wrapper
            showRevisions={showRevisions}
          />
        );
      case "list":
        return (
          <ListSection
            currentChart={chart}
            components={components}
            // Handle resize YAML wrapper
            showRevisions={showRevisions}
          />
        );
      case "values":
        return (
          <ValuesYaml
            currentChart={chart}
            refreshChart={() => getChartData(currentChart)}
            disabled={!isAuthorized("application", "", ["get", "update"])}
          />
        );
      case "build-settings":
        return (
          <BuildSettingsTab
            chart={chart}
            isPreviousVersion={isPreview}
            onSave={() => {
              getChartData(currentChart);
            }}
          />
        );
      default:
    }
  };

  const updateTabs = () => {
    // Collate non-form tabs
    let rightTabOptions = [] as any[];
    let leftTabOptions = [] as any[];
    leftTabOptions.push({ label: "Status", value: "status" });

    /* Temporarily disable incident detection
    if (!DisabledNamespacesForIncidents.includes(currentChart.namespace)) {
      leftTabOptions.push({ label: "Incidents", value: "incidents" });
    }
    */

    if (props.isMetricsInstalled) {
      leftTabOptions.push({ label: "Metrics", value: "metrics" });
    }

    rightTabOptions.push({ label: "Chart Overview", value: "graph" });

    if (devOpsMode) {
      rightTabOptions.push(
        { label: "Manifests", value: "list" },
        { label: "Helm Values", value: "values" }
      );
    }

    if (currentChart?.git_action_config?.git_repo && !isStack) {
      rightTabOptions.push({
        label: "Build Settings",
        value: "build-settings",
      });
    }

    // Settings tab is always last
    if (isAuthorized("application", "", ["get", "delete"])) {
      rightTabOptions.push({ label: "Settings", value: "settings" });
    }

    // Filter tabs if previewing an old revision or updating the chart version
    if (isPreview) {
      let liveTabs = ["status", "events", "settings", "deploy", "metrics"];
      rightTabOptions = rightTabOptions.filter(
        (tab: any) => !liveTabs.includes(tab.value)
      );
      leftTabOptions = leftTabOptions.filter(
        (tab: any) => !liveTabs.includes(tab.value)
      );
    }

    setLeftTabOptions(leftTabOptions);
    setRightTabOptions(rightTabOptions);
  };

  const setRevision = (chart: ChartType, isCurrent?: boolean) => {
    setIsPreview(!isCurrent);
    getChartData(chart);
  };

  // TODO: consolidate with pop + push in refreshTabs
  const toggleDevOpsMode = () => {
    setDevOpsMode(!devOpsMode);
  };

  const renderUrl = () => {
    if (url) {
      return (
        <Url href={url} target="_blank">
          <i className="material-icons">link</i>
          {url}
        </Url>
      );
    }

    const service: any = components?.find((c) => {
      return c.Kind === "Service";
    });

    if (loading) {
      return (
        <Url>
          <Bolded>Loading...</Bolded>
        </Url>
      );
    }

    if (!service?.Name || !service?.Namespace) {
      return;
    }

    return (
      <Url>
        <Bolded>Internal URI:</Bolded>
        {`${service.Name}.${service.Namespace}.svc.cluster.local`}
      </Url>
    );
  };

  const handleUninstallChart = async () => {
    setDeleting(true);
    setCurrentOverlay(null);
    const syncedEnvGroups = currentChart.config?.container?.env?.synced || [];
    const removeApplicationToEnvGroupPromises = syncedEnvGroups.map(
      (envGroup: any) => {
        return api.removeApplicationFromEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: currentChart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: currentChart.namespace,
          }
        );
      }
    );
    try {
      await Promise.all(removeApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't remove the synced env group from the application, please remove it manually before uninstalling the chart, or try again."
      );
      return;
    }

    try {
      if (currentChart.stack_id) {
        await api.removeStackAppResource(
          "<token>",
          {},
          {
            namespace: currentChart.namespace,
            app_resource_name: currentChart.name,
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            stack_id: currentChart.stack_id,
          }
        );
      } else {
        await api.uninstallTemplate(
          "<token>",
          {},
          {
            namespace: currentChart.namespace,
            name: currentChart.name,
            id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        );
      }

      props.closeChart();
    } catch (error) {
      console.log(error);
      setCurrentError("Couldn't uninstall chart, please try again");
    }
  };

  useEffect(() => {
    window.analytics?.track("Opened Chart", {
      chart: currentChart.name,
    });

    getChartData(currentChart).then(() => {
      getControllers(currentChart).then(() => {
        ["deployment", "statefulset", "daemonset", "replicaset"]
          .map((kind) => {
            setupWebsocket(kind);
            return kind;
          })
          .forEach((kind) => {
            openWebsocket(kind);
          });
      });
    });

    return () => {
      closeAllWebsockets();
    };
  }, []);

  useEffect(() => {
    updateTabs();
    localStorage.setItem("devOpsMode", devOpsMode.toString());
  }, [devOpsMode, currentChart?.form, isPreview]);

  useEffect((): any => {
    let isSubscribed = true;

    const ingressComponent = components?.find((c) => c.Kind === "Ingress");

    const ingressName = ingressComponent?.Name;

    if (!ingressName) return;

    api
      .getIngress(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: ingressName,
          cluster_id: currentCluster.id,
          namespace: `${currentChart.namespace}`,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }
        if (res.data?.spec?.rules && res.data?.spec?.rules[0]?.host) {
          setUrl(`https://${res.data?.spec?.rules[0]?.host}`);
          return;
        }

        if (res.data?.status?.loadBalancer?.ingress) {
          setUrl(
            `http://${res.data?.status?.loadBalancer?.ingress[0]?.hostname}`
          );
          return;
        }
      })
      .catch(console.log);
    return () => (isSubscribed = false);
  }, [components, currentCluster, currentProject, currentChart]);

  return (
    <>
      {fullScreenLogs ? (
        <StatusSection
          fullscreen={true}
          currentChart={currentChart}
          setFullScreenLogs={() => setFullScreenLogs(false)}
        />
      ) : (
        <StyledExpandedChart>
          <BreadcrumbRow>
            <Breadcrumb onClick={props.closeChart}>
              <ArrowIcon src={leftArrow} />
              <Wrap>Back</Wrap>
            </Breadcrumb>
          </BreadcrumbRow>
          <HeaderWrapper>
            <TitleSection
              icon={currentChart.chart.metadata.icon}
              iconWidth="33px"
            >
              {currentChart.name}
              <DeploymentType currentChart={currentChart} />
              <TagWrapper>
                Namespace <NamespaceTag>{currentChart.namespace}</NamespaceTag>
              </TagWrapper>
            </TitleSection>

            {currentChart.chart.metadata.name != "worker" &&
              currentChart.chart.metadata.name != "job" &&
              renderUrl()}
            <InfoWrapper>
              <StatusIndicator
                controllers={controllers}
                status={currentChart.info.status}
                margin_left={"0px"}
              />
              <LastDeployed>
                <Dot>•</Dot>Last deployed
                {" " + getReadableDate(currentChart.info.last_deployed)}
              </LastDeployed>
            </InfoWrapper>
          </HeaderWrapper>
          {deleting ? (
            <>
              <LineBreak />
              <Placeholder>
                <TextWrap>
                  <Header>
                    <Spinner src={loadingSrc} /> Deleting "{currentChart.name}"
                  </Header>
                  You will be automatically redirected after deletion is
                  complete.
                </TextWrap>
              </Placeholder>
            </>
          ) : (
            <>
              <RevisionSection
                showRevisions={showRevisions}
                toggleShowRevisions={() => {
                  setShowRevisions(!showRevisions);
                }}
                chart={currentChart}
                refreshChart={() => getChartData(currentChart)}
                setRevision={setRevision}
                forceRefreshRevisions={forceRefreshRevisions}
                refreshRevisionsOff={() => setForceRefreshRevisions(false)}
                shouldUpdate={
                  currentChart.latest_version &&
                  currentChart.latest_version !==
                    currentChart.chart.metadata.version
                }
                latestVersion={currentChart.latest_version}
                upgradeVersion={handleUpgradeVersion}
              />
              {isStack && isLoadingStackEnvGroups ? (
                <>
                  <LineBreak />
                  <Placeholder>
                    <TextWrap>
                      <Header>
                        <Spinner src={loadingSrc} />
                      </Header>
                    </TextWrap>
                  </Placeholder>
                </>
              ) : (
                <>
                  {(isPreview || leftTabOptions.length > 0) && (
                    <BodyWrapper>
                      <PorterFormWrapper
                        formData={cloneDeep(currentChart.form)}
                        valuesToOverride={{
                          namespace: props.namespace,
                          clusterId: currentCluster.id,
                        }}
                        renderTabContents={renderTabContents}
                        isReadOnly={
                          isPreview ||
                          imageIsPlaceholder ||
                          !isAuthorized("application", "", ["get", "update"])
                        }
                        onSubmit={onSubmit}
                        includeMetadata
                        rightTabOptions={rightTabOptions}
                        leftTabOptions={leftTabOptions}
                        color={isPreview ? "#f5cb42" : null}
                        addendum={
                          <TabButton
                            onClick={toggleDevOpsMode}
                            devOpsMode={devOpsMode}
                          >
                            <i className="material-icons">offline_bolt</i>{" "}
                            DevOps Mode
                          </TabButton>
                        }
                        saveValuesStatus={saveValuesStatus}
                        injectedProps={{
                          "key-value-array": {
                            availableSyncEnvGroups:
                              isStack && !isPreview
                                ? stackEnvGroups
                                : undefined,
                          },
                          "url-link": {
                            chart: currentChart,
                          },
                        }}
                      />
                    </BodyWrapper>
                  )}
                </>
              )}
            </>
          )}
        </StyledExpandedChart>
      )}
    </>
  );
};

export default ExpandedChart;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  z-index: 999;
`;

const Breadcrumb = styled.div`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Wrap = styled.div`
  z-index: 999;
`;

const TextWrap = styled.div``;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 1px;
  background: #494b4f;
  margin: 35px 0px;
`;

const BodyWrapper = styled.div`
  position: relative;
  margin-bottom: 50px;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Placeholder = styled.div`
  width: 100%;
  min-height: 300px;
  height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 10px;
  }
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const Bolded = styled.div`
  font-weight: 500;
  color: #ffffff44;
  margin-right: 6px;
`;

const Url = styled.a`
  display: block;
  margin-left: 2px;
  font-size: 13px;
  margin-top: 16px;
  user-select: all;
  margin-bottom: -5px;
  user-select: text;
  display: flex;
  align-items: center;

  > i {
    font-size: 15px;
    margin-right: 10px;
  }
`;

const TabButton = styled.div`
  position: absolute;
  right: 0px;
  height: 30px;
  background: linear-gradient(to right, #20222700, #202227 20%);
  padding-left: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${(props: { devOpsMode: boolean }) =>
    props.devOpsMode ? "#aaaabb" : "#aaaabb55"};
  margin-left: 35px;
  border-radius: 20px;
  text-shadow: 0px 0px 8px
    ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "#ffffff66" : "none"};
  cursor: pointer;
  :hover {
    color: ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "" : "#aaaabb99"};
  }

  > i {
    font-size: 17px;
    margin-right: 9px;
  }
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const Dot = styled.div`
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 3px;
  margin-top: 22px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 10px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 15px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const StyledExpandedChart = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  cursor: pointer;
`;
