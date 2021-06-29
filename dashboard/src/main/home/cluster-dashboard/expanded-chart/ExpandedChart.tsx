import React, { Component } from "react";
import styled from "styled-components";
import yaml from "js-yaml";
import close from "assets/close.png";
import _ from "lodash";
import loading from "assets/loading.gif";

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

type PropsType = {
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

export default class ExpandedChart extends Component<PropsType, StateType> {
  state = {
    currentChart: this.props.currentChart,
    loading: true,
    showRevisions: false,
    components: [] as ResourceType[],
    podSelectors: [] as string[],
    isPreview: false,
    isUpdatingChart: false,
    devOpsMode: localStorage.getItem("devOpsMode") === "true",
    tabOptions: [] as any[],
    saveValuesStatus: null as string | null,
    forceRefreshRevisions: false,
    controllers: {} as Record<string, Record<string, any>>,
    websockets: {} as Record<string, any>,
    url: null as string | null,
    showDeleteOverlay: false,
    deleting: false,
    formData: {} as any,
    imageIsPlaceholder: false,
    newestImage: null as string,
  };

  // Retrieve full chart data (includes form and values)
  getChartData = (chart: ChartType) => {
    let { currentProject } = this.context;
    let { currentCluster, currentChart } = this.props;

    this.setState({ loading: true });
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
        let tag = res.data?.config?.image?.tag.toString();
        let newestImage = tag ? image + ":" + tag : image;
        let imageIsPlaceholder = false;
        if (
          (image === "porterdev/hello-porter" ||
            image === "public.ecr.aws/o1j4x7p4/hello-porter") &&
          !this.state.newestImage
        ) {
          imageIsPlaceholder = true;
        }
        this.updateComponents(
          {
            currentChart: res.data,
            loading: false,
            imageIsPlaceholder,
            newestImage,
          },
          res.data
        );
      })
      .catch(console.log);
  };

  getControllers = async (chart: ChartType) => {
    let { currentCluster, currentProject, setCurrentError } = this.context;

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
              this.setState(
                {
                  controllers: {
                    ...this.state.controllers,
                    [c.metadata.uid]: c,
                  },
                },
                () => {
                  nextController();
                }
              );
            });
          });
          next();
        })
        .catch((err) => setCurrentError(JSON.stringify(err)));
    });
  };

  setupWebsocket = (kind: string, chart: ChartType) => {
    let { currentCluster, currentProject } = this.context;
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

        if (!this.state.controllers[object.metadata.uid]) return;

        this.setState({
          controllers: {
            ...this.state.controllers,
            [object.metadata.uid]: object,
          },
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

  setControllerWebsockets = (controller_types: any[], chart: ChartType) => {
    let websockets = controller_types.map((kind: string) => {
      return this.setupWebsocket(kind, chart);
    });
    this.setState({ websockets });
  };

  updateComponents = (state: any, currentChart: ChartType) => {
    let { currentCluster, currentProject } = this.context;

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
        let newState = state || {};

        newState.components = res.data.Objects;
        newState.podSelectors = res.data.PodSelectors;

        this.setState(newState);
        this.updateTabs();
      })
      .catch(console.log);
  };

  refreshChart = () => this.getChartData(this.state.currentChart);

  onSubmit = (rawValues: any) => {
    let { currentProject, currentCluster, setCurrentError } = this.context;

    // Convert dotted keys to nested objects
    let values = {};

    // Weave in preexisting values and convert to yaml
    if (this.props.currentChart.config) {
      values = this.props.currentChart.config;
    }

    // Override config from currentChart prop if we have it on the current state
    if (this.state.currentChart.config) {
      values = this.state.currentChart.config;
    }

    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    let valuesYaml = yaml.dump({
      ...values,
    });

    this.setState({ saveValuesStatus: "loading" });
    this.refreshChart();

    api
      .upgradeChartValues(
        "<token>",
        {
          namespace: this.state.currentChart.namespace,
          storage: StorageType.Secret,
          values: valuesYaml,
        },
        {
          id: currentProject.id,
          name: this.state.currentChart.name,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({
          saveValuesStatus: "successful",
          forceRefreshRevisions: true,
        });

        window.analytics.track("Chart Upgraded", {
          chart: this.state.currentChart.name,
          values: valuesYaml,
        });
      })
      .catch((err) => {
        let parsedErr =
          err?.response?.data?.errors && err.response.data.errors[0];

        if (parsedErr) {
          err = parsedErr;
        }

        this.setState({
          saveValuesStatus: err,
        });

        setCurrentError(parsedErr);

        window.analytics.track("Failed to Upgrade Chart", {
          chart: this.state.currentChart.name,
          values: valuesYaml,
          error: err,
        });
      });
  };

  handleUpgradeVersion = (version: string, cb: () => void) => {
    let { currentProject, currentCluster, setCurrentError } = this.context;

    // convert current values to yaml
    let values = this.props.currentChart.config;

    let valuesYaml = yaml.dump({
      ...values,
    });

    this.setState({ saveValuesStatus: "loading" });
    this.refreshChart();

    api
      .upgradeChartValues(
        "<token>",
        {
          namespace: this.state.currentChart.namespace,
          storage: StorageType.Secret,
          values: valuesYaml,
          version: version,
        },
        {
          id: currentProject.id,
          name: this.state.currentChart.name,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        this.setState({
          saveValuesStatus: "successful",
          forceRefreshRevisions: true,
        });

        window.analytics.track("Chart Upgraded", {
          chart: this.state.currentChart.name,
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

        this.setState({
          saveValuesStatus: err,
          loading: false,
        });

        setCurrentError(parsedErr);

        window.analytics.track("Failed to Upgrade Chart", {
          chart: this.state.currentChart.name,
          values: valuesYaml,
          error: err,
        });
      });
  };

  renderTabContents = (currentTab: string) => {
    let { components, showRevisions, imageIsPlaceholder } = this.state;
    let { setSidebar } = this.props;
    let { currentChart } = this.state;
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
                  <Spinner src={loading} /> This application is currently being
                  deployed
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
            refreshChart={this.refreshChart}
            setShowDeleteOverlay={(x: boolean) =>
              this.setState({ showDeleteOverlay: x })
            }
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
          <ValuesYaml currentChart={chart} refreshChart={this.refreshChart} />
        );
      default:
    }
  };

  updateTabs() {
    let formData = this.state.currentChart.form;
    if (formData) {
      this.setState({ formData });
    }

    // Collate non-form tabs
    let tabOptions = [] as any[];
    tabOptions.push({ label: "Status", value: "status" });

    if (this.props.isMetricsInstalled) {
      tabOptions.push({ label: "Metrics", value: "metrics" });
    }

    tabOptions.push({ label: "Chart Overview", value: "graph" });

    if (this.state.devOpsMode) {
      tabOptions.push(
        { label: "Manifests", value: "list" },
        { label: "Helm Values", value: "values" }
      );
    }

    // Settings tab is always last
    tabOptions.push({ label: "Settings", value: "settings" });

    // Filter tabs if previewing an old revision or updating the chart version
    if (this.state.isPreview || this.state.isUpdatingChart) {
      let liveTabs = ["status", "settings", "deploy", "metrics"];
      tabOptions = tabOptions.filter(
        (tab: any) => !liveTabs.includes(tab.value)
      );
    }

    this.setState({ tabOptions });
  }

  setRevision = (chart: ChartType, isCurrent?: boolean) => {
    this.setState({ isPreview: !isCurrent });
    this.getChartData(chart);
  };

  // TODO: consolidate with pop + push in refreshTabs
  toggleDevOpsMode = () => {
    if (this.state.devOpsMode) {
      this.setState({ devOpsMode: false }, () => {
        this.updateTabs();
        localStorage.setItem("devOpsMode", "false");
      });
    } else {
      this.setState({ devOpsMode: true }, () => {
        this.updateTabs();
        localStorage.setItem("devOpsMode", "true");
      });
    }
  };

  renderIcon = () => {
    let { currentChart } = this.state;

    if (
      currentChart.chart.metadata.icon &&
      currentChart.chart.metadata.icon !== ""
    ) {
      return <Icon src={currentChart.chart.metadata.icon} />;
    } else {
      return <i className="material-icons">tonality</i>;
    }
  };

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${time} on ${date}`;
  };

  getChartStatus = (chartStatus: string) => {
    if (chartStatus === "deployed") {
      for (var uid in this.state.controllers) {
        let value = this.state.controllers[uid];
        let available = this.getAvailability(value.metadata.kind, value);
        let progressing = true;

        this.state.controllers[uid]?.status?.conditions?.forEach(
          (condition: any) => {
            if (
              condition.type == "Progressing" &&
              condition.status == "False" &&
              condition.reason == "ProgressDeadlineExceeded"
            ) {
              progressing = false;
            }
          }
        );

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

  getAvailability = (kind: string, c: any) => {
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

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    let { currentChart } = this.state;

    window.analytics.track("Opened Chart", {
      chart: currentChart.name,
    });

    this.getChartData(currentChart);
    this.getControllers(currentChart);
    this.setControllerWebsockets(
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
      .then((res) =>
        this.setState({ components: res.data.Objects }, () => {
          let ingressName = null;
          for (var i = 0; i < this.state.components.length; i++) {
            if (this.state.components[i].Kind === "Ingress") {
              ingressName = this.state.components[i].Name;
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
                namespace: `${this.state.currentChart.namespace}`,
              }
            )
            .then((res) => {
              if (res.data?.spec?.rules && res.data?.spec?.rules[0]?.host) {
                this.setState({
                  url: `https://${res.data?.spec?.rules[0]?.host}`,
                });
                return;
              }

              if (res.data?.status?.loadBalancer?.ingress) {
                this.setState({
                  url: `http://${res.data?.status?.loadBalancer?.ingress[0]?.hostname}`,
                });
                return;
              }
            })
            .catch(console.log);
        })
      )
      .catch(console.log);
  }

  componentWillUnmount() {
    if (this.state.websockets?.length > 0) {
      this.state.websockets?.forEach((ws: WebSocket) => {
        ws.close();
      });
    }
  }

  renderUrl = () => {
    if (this.state.url) {
      return (
        <Url href={this.state.url} target="_blank">
          <i className="material-icons">link</i>
          {this.state.url}
        </Url>
      );
    } else {
      let serviceName = null as string;
      let serviceNamespace = null as string;

      this.state.components?.forEach((c: any) => {
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

  handleUninstallChart = () => {
    let { currentProject, currentCluster } = this.context;
    let { currentChart } = this.state;
    this.setState({ deleting: true });
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
        this.setState({ showDeleteOverlay: false });
        this.props.closeChart();
      })
      .catch(console.log);
  };

  renderDeleteOverlay = () => {
    if (this.state.deleting) {
      return (
        <DeleteOverlay>
          <Loading />
        </DeleteOverlay>
      );
    }
  };

  render() {
    let { closeChart } = this.props;
    let { currentChart } = this.state;
    let chart = currentChart;
    let status = this.getChartStatus(chart.info.status);

    return (
      <>
        <CloseOverlay onClick={closeChart} />
        <StyledExpandedChart>
          <ConfirmOverlay
            show={this.state.showDeleteOverlay}
            message={`Are you sure you want to delete ${currentChart.name}?`}
            onYes={this.handleUninstallChart}
            onNo={() => this.setState({ showDeleteOverlay: false })}
          />
          {this.renderDeleteOverlay()}

          <HeaderWrapper>
            <TitleSection>
              <Title>
                <IconWrapper>{this.renderIcon()}</IconWrapper>
                {chart.name}
              </Title>
              {chart.chart.metadata.name != "worker" &&
                chart.chart.metadata.name != "job" &&
                this.renderUrl()}
              <InfoWrapper>
                <StatusIndicator
                  controllers={this.state.controllers}
                  status={chart.info.status}
                  margin_left={"0px"}
                />
                <LastDeployed>
                  <Dot>•</Dot>Last deployed
                  {" " + this.readableDate(chart.info.last_deployed)}
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
              showRevisions={this.state.showRevisions}
              toggleShowRevisions={() => {
                this.setState({ showRevisions: !this.state.showRevisions });
              }}
              chart={chart}
              refreshChart={this.refreshChart}
              setRevision={this.setRevision}
              forceRefreshRevisions={this.state.forceRefreshRevisions}
              refreshRevisionsOff={() =>
                this.setState({ forceRefreshRevisions: false })
              }
              status={status}
              shouldUpdate={
                chart.latest_version &&
                chart.latest_version !== chart.chart.metadata.version
              }
              latestVersion={chart.latest_version}
              upgradeVersion={this.handleUpgradeVersion}
            />
          </HeaderWrapper>
          <BodyWrapper>
            <FormWrapper
              isReadOnly={this.state.imageIsPlaceholder}
              formData={this.state.formData}
              tabOptions={this.state.tabOptions}
              isInModal={true}
              renderTabContents={this.renderTabContents}
              onSubmit={this.onSubmit}
              saveValuesStatus={this.state.saveValuesStatus}
              externalValues={{
                namespace: this.props.namespace,
                clusterId: this.context.currentCluster.id,
              }}
              color={this.state.isPreview ? "#f5cb42" : null}
              addendum={
                <TabButton
                  onClick={this.toggleDevOpsMode}
                  devOpsMode={this.state.devOpsMode}
                >
                  <i className="material-icons">offline_bolt</i> DevOps Mode
                </TabButton>
              }
            />
          </BodyWrapper>
        </StyledExpandedChart>
      </>
    );
  }
}

ExpandedChart.contextType = Context;

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
