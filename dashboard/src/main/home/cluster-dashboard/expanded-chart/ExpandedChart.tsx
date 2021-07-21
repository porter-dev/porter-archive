import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import styled from "styled-components";
import yaml from "js-yaml";
import close from "assets/close.png";
import _ from "lodash";
import loadingSrc from "assets/loading.gif";

import {
  ResourceType,
  ChartType,
  StorageType,
  ClusterType,
} from "shared/types";
import { Context } from "shared/Context";
import api from "shared/api";

import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import StatusIndicator from "components/StatusIndicator";
import FormWrapper from "components/values-form/FormWrapper";
import RevisionSection from "./RevisionSection";
import ValuesYaml from "./ValuesYaml";
import GraphSection from "./GraphSection";
import MetricsSection from "./metrics/MetricsSection";
import ListSection from "./ListSection";
import StatusSection from "./status/StatusSection";
import SettingsSection from "./SettingsSection";
import { useWebsockets } from "shared/hooks/useWebsockets";
import useAuth from "shared/auth/useAuth";

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
  const [components, setComponents] = useState<ResourceType[]>([]);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [devOpsMode, setDevOpsMode] = useState<boolean>(
    localStorage.getItem("devOpsMode") === "true"
  );
  const [tabOptions, setTabOptions] = useState<any[]>([]);
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [forceRefreshRevisions, setForceRefreshRevisions] = useState<boolean>(
    false
  );
  const [controllers, setControllers] = useState<
    Record<string, Record<string, any>>
  >({});
  const [url, setUrl] = useState<string>(null);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [imageIsPlaceholder, setImageIsPlaceholer] = useState<boolean>(false);
  const [newestImage, setNewestImage] = useState<string>(null);

  const [isAuthorized] = useAuth();

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  // Retrieve full chart data (includes form and values)
  const getChartData = async (chart: ChartType) => {
    const res = await api.getChart(
      "<token>",
      {
        namespace: chart.namespace,
        cluster_id: currentCluster.id,
        storage: StorageType.Secret,
      },
      {
        name: chart.name,
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
    updateComponents(
      {
        currentChart: res.data,
        loading: false,
        imageIsPlaceholder,
        newestImage: newNewestImage,
      },
      res.data
    );
  };

  const getControllers = async (chart: ChartType) => {
    // don't retrieve controllers for chart that failed to even deploy.
    if (chart.info.status == "failed") return;

    try {
      const { data: chartControllers } = await api.getChartControllers(
        "<token>",
        {
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: chart.name,
          revision: chart.version,
        }
      );

      chartControllers.forEach((c: any) => {
        c.metadata.kind = c.kind;

        setControllers((oldControllers) => ({
          ...oldControllers,
          [c.metadata.kind]: c,
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
    const apiEndpoint = `/api/projects/${currentProject.id}/k8s/${kind}/status?cluster_id=${currentCluster.id}`;

    const wsConfig = {
      onmessage(evt: MessageEvent) {
        const event = JSON.parse(evt.data);

        if (event.event_type == "UPDATE") {
          let object = event.Object;
          object.metadata.kind = event.Kind;

          setControllers((oldControllers) => {
            if (oldControllers[object.metadata.uid]) {
              return oldControllers;
            }
            return {
              ...oldControllers,
              [object.metadata.uid]: object,
            };
          });
        }
      },
      onerror() {
        closeWebsocket(kind);
      },
    };

    newWebsocket(kind, apiEndpoint, wsConfig);
  };

  const updateComponents = async (state: any, currentChart: ChartType) => {
    try {
      const res = await api.getChartComponents(
        "<token>",
        {
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          id: currentProject.id,
          name: currentChart.name,
          revision: currentChart.version,
        }
      );
      setCurrentChart(state.currentChart);
      setImageIsPlaceholer(state.imageIsPlaceholder);
      setNewestImage(state.newestImage);
      setComponents(res.data.Objects);
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (rawValues: any) => {
    // Convert dotted keys to nested objects
    let values = {};

    // Weave in preexisting values and convert to yaml
    if (props.currentChart.config) {
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

    setSaveValueStatus("loading");
    getChartData(currentChart);
    try {
      await api.upgradeChartValues(
        "<token>",
        {
          namespace: currentChart.namespace,
          storage: StorageType.Secret,
          values: valuesYaml,
        },
        {
          id: currentProject.id,
          name: currentChart.name,
          cluster_id: currentCluster.id,
        }
      );

      setSaveValueStatus("successful");
      setForceRefreshRevisions(true);

      window.analytics.track("Chart Upgraded", {
        chart: currentChart.name,
        values: valuesYaml,
      });
    } catch (err) {
      const parsedErr =
        err?.response?.data?.errors && err.response.data.errors[0];

      if (parsedErr) {
        err = parsedErr;
      }

      setSaveValueStatus(err);

      setCurrentError(parsedErr);

      window.analytics.track("Failed to Upgrade Chart", {
        chart: currentChart.name,
        values: valuesYaml,
        error: err,
      });
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
            namespace: currentChart.namespace,
            storage: StorageType.Secret,
            values: valuesYaml,
            version: version,
          },
          {
            id: currentProject.id,
            name: currentChart.name,
            cluster_id: currentCluster.id,
          }
        );
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics.track("Chart Upgraded", {
          chart: currentChart.name,
          values: valuesYaml,
        });

        cb && cb();
      } catch (err) {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

        if (parsedErr) {
          err = parsedErr;
        }

        setSaveValueStatus(err);
        setCurrentError(parsedErr);

        window.analytics.track("Failed to Upgrade Chart", {
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
      case "status":
        if (imageIsPlaceholder) {
          return (
            <Placeholder>
              <TextWrap>
                <Header>
                  <Spinner src={loadingSrc} /> This application is currently
                  being deployed
                </Header>
                Navigate to the "Actions" tab of your GitHub repo to view live
                build logs.
              </TextWrap>
            </Placeholder>
          );
        } else {
          return <StatusSection currentChart={chart} />;
        }
      case "settings":
        return (
          <SettingsSection
            currentChart={chart}
            refreshChart={() => getChartData(currentChart)}
            setShowDeleteOverlay={(x: boolean) => setShowDeleteOverlay(x)}
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
      default:
    }
  };

  const updateTabs = () => {
    // Collate non-form tabs
    let tabOptions = [] as any[];
    tabOptions.push({ label: "Status", value: "status" });

    if (props.isMetricsInstalled) {
      tabOptions.push({ label: "Metrics", value: "metrics" });
    }

    tabOptions.push({ label: "Chart Overview", value: "graph" });

    if (devOpsMode) {
      tabOptions.push(
        { label: "Manifests", value: "list" },
        { label: "Helm Values", value: "values" }
      );
    }

    // Settings tab is always last
    if (isAuthorized("application", "", ["get", "delete"])) {
      tabOptions.push({ label: "Settings", value: "settings" });
    }

    // Filter tabs if previewing an old revision or updating the chart version
    if (isPreview) {
      let liveTabs = ["status", "settings", "deploy", "metrics"];
      tabOptions = tabOptions.filter(
        (tab: any) => !liveTabs.includes(tab.value)
      );
    }

    setTabOptions(tabOptions);
  };

  const setRevision = (chart: ChartType, isCurrent?: boolean) => {
    setIsPreview(!isCurrent);
    getChartData(chart);
  };

  // TODO: consolidate with pop + push in refreshTabs
  const toggleDevOpsMode = () => {
    setDevOpsMode(!devOpsMode);
  };

  const renderIcon = () => {
    if (
      currentChart.chart.metadata.icon &&
      currentChart.chart.metadata.icon !== ""
    ) {
      return <Icon src={currentChart.chart.metadata.icon} />;
    } else {
      return <i className="material-icons">tonality</i>;
    }
  };

  const chartStatus = useMemo(() => {
    const getAvailability = (kind: string, c: any) => {
      switch (kind?.toLowerCase()) {
        case "deployment":
        case "replicaset":
          return c.status.availableReplicas == c.status.replicas;
        case "statefulset":
          return c.status.readyReplicas == c.status.replicas;
        case "daemonset":
          return c.status.numberAvailable == c.status.desiredNumberScheduled;
      }
    };

    const chartStatus = currentChart.info.status;

    if (chartStatus === "deployed") {
      for (var uid in controllers) {
        let value = controllers[uid];
        let available = getAvailability(value.metadata.kind, value);
        let progressing = true;

        controllers[uid]?.status?.conditions?.forEach((condition: any) => {
          if (
            condition.type == "Progressing" &&
            condition.status == "False" &&
            condition.reason == "ProgressDeadlineExceeded"
          ) {
            progressing = false;
          }
        });

        if (!available && progressing) {
          return "loading";
        } else if (!available && !progressing) {
          return "failed";
        }
      }
      return "deployed";
    }
    return chartStatus;
  }, [currentChart, controllers]);

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
    try {
      await api.uninstallTemplate(
        "<token>",
        {},
        {
          namespace: currentChart.namespace,
          storage: StorageType.Secret,
          name: currentChart.name,
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      setShowDeleteOverlay(false);
      props.closeChart();
    } catch (error) {
      console.log(error);
      setCurrentError("Couldn't uninstall chart, please try again");
    }
  };

  useEffect(() => {
    window.analytics.track("Opened Chart", {
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

  useEffect(() => {
    let isSubscribed = true;
    let ingressName = null;
    for (var i = 0; i < components.length; i++) {
      if (components[i].Kind === "Ingress") {
        ingressName = components[i].Name;
      }
    }

    if (!ingressName) return;

    api
      .getIngress(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          id: currentProject.id,
          name: ingressName,
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
  }, [components]);

  return (
    <>
      <CloseOverlay onClick={props.closeChart} />
      <StyledExpandedChart>
        <ConfirmOverlay
          show={showDeleteOverlay}
          message={`Are you sure you want to delete ${currentChart.name}?`}
          onYes={handleUninstallChart}
          onNo={() => setShowDeleteOverlay(false)}
        />
        {deleting && (
          <DeleteOverlay>
            <Loading />
          </DeleteOverlay>
        )}
        <HeaderWrapper>
          <TitleSection>
            <Title>
              <IconWrapper>{renderIcon()}</IconWrapper>
              {currentChart.name}
            </Title>
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

            <TagWrapper>
              Namespace <NamespaceTag>{currentChart.namespace}</NamespaceTag>
            </TagWrapper>
          </TitleSection>

          <CloseButton onClick={props.closeChart}>
            <CloseButtonImg src={close} />
          </CloseButton>

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
            status={chartStatus}
            shouldUpdate={
              currentChart.latest_version &&
              currentChart.latest_version !==
                currentChart.chart.metadata.version
            }
            latestVersion={currentChart.latest_version}
            upgradeVersion={handleUpgradeVersion}
          />
        </HeaderWrapper>
        <BodyWrapper>
          <FormWrapper
            isReadOnly={
              imageIsPlaceholder ||
              !isAuthorized("application", "", ["get", "update"])
            }
            formData={currentChart.form}
            tabOptions={tabOptions}
            isInModal={true}
            renderTabContents={renderTabContents}
            onSubmit={onSubmit}
            saveValuesStatus={saveValuesStatus}
            externalValues={{
              namespace: props.namespace,
              clusterId: currentCluster.id,
            }}
            color={isPreview ? "#f5cb42" : null}
            addendum={
              <TabButton onClick={toggleDevOpsMode} devOpsMode={devOpsMode}>
                <i className="material-icons">offline_bolt</i> DevOps Mode
              </TabButton>
            }
          />
        </BodyWrapper>
      </StyledExpandedChart>
    </>
  );
};

export default ExpandedChart;

const TextWrap = styled.div``;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Placeholder = styled.div`
  height: 100%;
  padding: 30px;
  padding-bottom: 90px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;

const BodyWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const DeleteOverlay = styled.div`
  position: absolute;
  top: 0px;
  opacity: 100%;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  padding-bottom: 30px;
  align-items: center;
  justify-content: center;
  font-family: "Work Sans", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: white;
  flex-direction: column;
  background: rgb(0, 0, 0, 0.73);
  opacity: 0;
  animation: lindEnter 0.2s;
  animation-fill-mode: forwards;

  @keyframes lindEnter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
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
  background: linear-gradient(to right, #26282f00, #26282f 20%);
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

const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #202227;
  animation: fadeIn 0.2s 0s;
  opacity: 0;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const HeaderWrapper = styled.div``;

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
  position: absolute;
  bottom: 0px;
  right: 0px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
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

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > i {
    font-size: 20px;
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  user-select: text;
`;

const TitleSection = styled.div`
  width: 100%;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledExpandedChart = styled.div`
  width: calc(100% - 50px);
  height: calc(100% - 50px);
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;
  border-radius: 10px;
  background: #26272f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px;
  display: flex;
  overflow: hidden;
  flex-direction: column;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
