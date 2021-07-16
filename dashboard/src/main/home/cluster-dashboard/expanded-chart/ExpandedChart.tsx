import React, { useContext, useState, useEffect, useRef } from "react";
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
import ChartList from "../chart/ChartList";
import { withAuth, WithAuthProps } from "shared/auth/AuthorizationHoc";

type PropsType = WithAuthProps & {
  namespace: string;
  currentChart: ChartType;
  currentCluster: ClusterType;
  closeChart: () => void;
  setSidebar: (x: boolean) => void;
  isMetricsInstalled: boolean;
};

type StateType = {
  currentChart: ChartType;
  loading: boolean;
  showRevisions: boolean;
  components: ResourceType[];
  podSelectors: string[];
  isPreview: boolean;
  isUpdatingChart: boolean;
  devOpsMode: boolean;
  tabOptions: any[];
  saveValuesStatus: string | null;
  forceRefreshRevisions: boolean; // Update revisions after upgrading values
  controllers: Record<string, Record<string, any>>;
  websockets: Record<string, any>;
  url: string | null;
  showDeleteOverlay: boolean;
  deleting: boolean;
  formData: any;
  imageIsPlaceholder: boolean;
  newestImage: string;
};

const ExpandedChart: React.FC<PropsType> = (props) => {
  const [currentChart, setCurrentChart] = useState<ChartType>(
    props.currentChart
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const [components, setComponents] = useState<ResourceType[]>([]);
  const [podSelectors, setPodSelectors] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isUpdatingChart, setIsUpdatingChart] = useState<boolean>(false);
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
  const controllersCallback = useRef(null);
  const [websockets, setWebsockets] = useState<Record<string, any>>({});
  const [url, setUrl] = useState<string>(null);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({});
  const [imageIsPlaceholder, setImageIsPlaceholer] = useState<boolean>(false);
  const [newestImage, setNewestImage] = useState<string>(null);

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  // Retrieve full chart data (includes form and values)
  const getChartData = (chart: ChartType) => {
    let { currentCluster, currentChart } = props;

    setLoading(true);
    api
      .getChart(
        "<token>",
        {
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          storage: StorageType.Secret,
        },
        {
          name: chart.name,
          revision: chart.version,
          id: currentProject.id,
        }
      )
      .then((res) => {
        let image = res.data?.config?.image?.repository;
        let tag = res.data?.config?.image?.tag?.toString();
        let newNewestImage = tag ? image + ":" + tag : image;
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
            newNewestImage,
          },
          res.data
        );
      })
      .catch(console.log);
  };

  const getControllers = async (chart: ChartType) => {
    // don't retrieve controllers for chart that failed to even deploy.
    if (chart.info.status == "failed") return;

    // TODO: properly promisify
    await new Promise((next: (res?: any) => void) => {
      api
        .getChartControllers(
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
        )
        .then((res) => {
          res.data?.forEach(async (c: any) => {
            await new Promise((nextController: (res?: any) => void) => {
              c.metadata.kind = c.kind;
              controllersCallback.current = nextController;
              setControllers({
                ...controllers,
                [c.metadata.uid]: c,
              });
            });
          });
          next();
        })
        .catch((err) => setCurrentError(JSON.stringify(err)));
    });
  };

  const setupWebsocket = (kind: string, chart: ChartType) => {
    let protocol = window.location.protocol == "https:" ? "wss" : "ws";
    let ws = new WebSocket(
      `${protocol}://${window.location.host}/api/projects/${currentProject.id}/k8s/${kind}/status?cluster_id=${currentCluster.id}`
    );
    ws.onopen = () => {
      console.log("connected to websocket");
    };

    ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);

      if (event.event_type == "UPDATE") {
        let object = event.Object;
        object.metadata.kind = event.Kind;

        if (!controllers[object.metadata.uid]) return;

        setControllers({
          ...controllers,
          [object.metadata.uid]: object,
        });
      }
    };

    ws.onclose = () => {
      console.log("closing websocket");
    };

    ws.onerror = (err: ErrorEvent) => {
      console.log(err);
      ws.close();
    };

    return ws;
  };

  const setControllerWebsockets = (
    controller_types: any[],
    chart: ChartType
  ) => {
    let websockets = controller_types.map((kind: string) => {
      return setupWebsocket(kind, chart);
    });
    setWebsockets(websockets);
  };

  const updateComponents = (state: any, currentChart: ChartType) => {
    api
      .getChartComponents(
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
      )
      .then((res) => {
        setComponents(res.data.Objects);
        setPodSelectors(res.data.PodSelectors);
        updateTabs();
      })
      .catch(console.log);
  };

  const refreshChart = () => getChartData(currentChart);

  const onSubmit = (rawValues: any) => {
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
    refreshChart();

    api
      .upgradeChartValues(
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
      )
      .then(() => {
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics.track("Chart Upgraded", {
          chart: currentChart.name,
          values: valuesYaml,
        });
      })
      .catch((err) => {
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
      });
  };

  const handleUpgradeVersion = (version: string, cb: () => void) => {
    // convert current values to yaml
    let values = currentChart.config;

    let valuesYaml = yaml.dump({
      ...values,
    });

    setSaveValueStatus("loading");
    refreshChart();

    api
      .upgradeChartValues(
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
      )
      .then(() => {
        setSaveValueStatus("successful");
        setForceRefreshRevisions(true);

        window.analytics.track("Chart Upgraded", {
          chart: currentChart.name,
          values: valuesYaml,
        });

        cb && cb();
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

        if (parsedErr) {
          err = parsedErr;
        }

        setSaveValueStatus(err);
        setLoading(false);
        setCurrentError(parsedErr);

        window.analytics.track("Failed to Upgrade Chart", {
          chart: currentChart.name,
          values: valuesYaml,
          error: err,
        });
      });
  };

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
            refreshChart={refreshChart}
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
            refreshChart={refreshChart}
            disabled={!props.isAuthorized("application", "", ["get", "update"])}
          />
        );
      default:
    }
  };

  const updateTabs = () => {
    let formData = currentChart.form;
    if (formData) {
      setFormData(formData);
    }

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
    if (props.isAuthorized("application", "", ["get", "delete"])) {
      tabOptions.push({ label: "Settings", value: "settings" });
    }

    // Filter tabs if previewing an old revision or updating the chart version
    if (isPreview || isUpdatingChart) {
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

  const readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  const getChartStatus = (chartStatus: string) => {
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
  };

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

  useEffect(() => {
    window.analytics.track("Opened Chart", {
      chart: currentChart.name,
    });

    getChartData(currentChart);
    getControllers(currentChart); // isn't this async?
    setControllerWebsockets(
      ["deployment", "statefulset", "daemonset", "replicaset"],
      currentChart
    );

    api
      .getChartComponents(
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
      )
      .then((res) => setComponents(res.data.Objects))
      .catch(console.log);

    return () => {
      if (websockets?.length > 0) {
        websockets?.forEach((ws: WebSocket) => {
          ws.close();
        });
      }
    };
  }, []);

  const renderUrl = () => {
    if (url) {
      return (
        <Url href={url} target="_blank">
          <i className="material-icons">link</i>
          {url}
        </Url>
      );
    } else {
      let serviceName = null as string;
      let serviceNamespace = null as string;

      components?.forEach((c: any) => {
        if (c.Kind == "Service") {
          serviceName = c.Name;
          serviceNamespace = c.Namespace;
        }
      });

      if (!serviceName || !serviceNamespace) {
        return;
      }

      return (
        <Url>
          <Bolded>Internal URI:</Bolded>
          {`${serviceName}.${serviceNamespace}.svc.cluster.local`}
        </Url>
      );
    }
  };

  const handleUninstallChart = () => {
    setDeleting(true);
    api
      .uninstallTemplate(
        "<token>",
        {},
        {
          namespace: currentChart.namespace,
          storage: StorageType.Secret,
          name: currentChart.name,
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        setShowDeleteOverlay(false);
        props.closeChart();
      })
      .catch(console.log);
  };

  const renderDeleteOverlay = () => {
    if (deleting) {
      return (
        <DeleteOverlay>
          <Loading />
        </DeleteOverlay>
      );
    }
  };

  useEffect(() => {
    if (controllersCallback.current) controllersCallback.current();
  }, [controllers]);

  useEffect(() => {
    updateTabs();
    localStorage.setItem("devOpsMode", devOpsMode.toString());
  }, [devOpsMode]);

  useEffect(() => {
    let ingressName = null;
    for (var i = 0; i < components.length; i++) {
      if (components[i].Kind === "Ingress") {
        ingressName = components[i].Name;
      }
    }

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
  }, [components]);

  let { closeChart } = props;
  let chart = currentChart;
  let status = getChartStatus(chart.info.status);

  return (
    <>
      <CloseOverlay onClick={closeChart} />
      <StyledExpandedChart>
        <ConfirmOverlay
          show={showDeleteOverlay}
          message={`Are you sure you want to delete ${currentChart.name}?`}
          onYes={handleUninstallChart}
          onNo={() => setShowDeleteOverlay(false)}
        />
        {renderDeleteOverlay()}

        <HeaderWrapper>
          <TitleSection>
            <Title>
              <IconWrapper>{renderIcon()}</IconWrapper>
              {chart.name}
            </Title>
            {chart.chart.metadata.name != "worker" &&
              chart.chart.metadata.name != "job" &&
              renderUrl()}
            <InfoWrapper>
              <StatusIndicator
                controllers={controllers}
                status={chart.info.status}
                margin_left={"0px"}
              />
              <LastDeployed>
                <Dot>•</Dot>Last deployed
                {" " + readableDate(chart.info.last_deployed)}
              </LastDeployed>
            </InfoWrapper>

            <TagWrapper>
              Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
            </TagWrapper>
          </TitleSection>

          <CloseButton onClick={closeChart}>
            <CloseButtonImg src={close} />
          </CloseButton>

          <RevisionSection
            showRevisions={showRevisions}
            toggleShowRevisions={() => {
              setShowRevisions(!showRevisions);
            }}
            chart={chart}
            refreshChart={refreshChart}
            setRevision={setRevision}
            forceRefreshRevisions={forceRefreshRevisions}
            refreshRevisionsOff={() => setForceRefreshRevisions(false)}
            status={status}
            shouldUpdate={
              chart.latest_version &&
              chart.latest_version !== chart.chart.metadata.version
            }
            latestVersion={chart.latest_version}
            upgradeVersion={handleUpgradeVersion}
          />
        </HeaderWrapper>
        <BodyWrapper>
          <FormWrapper
            isReadOnly={
              imageIsPlaceholder ||
              props.isAuthorized("application", "", ["get", "update"])
            }
            formData={formData}
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

export default withAuth(ExpandedChart);

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
