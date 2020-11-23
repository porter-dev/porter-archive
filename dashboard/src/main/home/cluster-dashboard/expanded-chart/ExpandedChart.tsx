import React, { Component } from 'react';
import styled from 'styled-components';
import yaml from 'js-yaml';
import { Base64 } from 'js-base64';
import close from '../../../../assets/close.png';

import { ResourceType, ChartType, StorageType, ChoiceType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import TabRegion from '../../../../components/TabRegion';
import RevisionSection from './RevisionSection';
import ValuesYaml from './ValuesYaml';
import GraphSection from './GraphSection';
import ListSection from './ListSection';
import LogSection from './log/LogSection';
import ValuesForm from '../../../../components/values-form/ValuesForm';
import SettingsSection from './SettingsSection';

type PropsType = {
  currentChart: ChartType,
  setCurrentChart: (x: ChartType | null) => void,
  refreshChart: () => void,
  setSidebar: (x: boolean) => void
};

type StateType = {
  showRevisions: boolean,
  components: ResourceType[],
  podSelectors: string[]
  revisionPreview: ChartType | null,
  devOpsMode: boolean,
  tabOptions: ChoiceType[],
  tabContents: any,
  checkTabExists: boolean,
};

const defaultTab = 'logs';

const dummyFormTabs = [
  { "Name": "values", "Label": "Main Settings", "Sections": [{ "Name": "main", "ShowIf": "", "Contents": [{ "Type": "heading", "Label": "🍺 Hello Porter Settings", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "subtitle", "Label": "Update ports for Hello Porter with Porter", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "number-input", "Label": "Service Port", "Name": "service-port", "Variable": "service.port", "Settings": { "Default": 80 } }, { "Type": "number-input", "Label": "Target Port", "Name": "target-port", "Variable": "service.targetPort", "Settings": { "Default": 8005 } }, { "Type": "checkbox", "Label": "Show hidden section", "Name": "show-hidden", "Variable": "", "Settings": { "Default": null } }] }, { "Name": "secondary", "ShowIf": "show-hidden", "Contents": [{ "Type": "heading", "Label": "This is a collapsible section!", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "subtitle", "Label": "Test section toggling", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "string-input", "Label": "Service Account Name", "Name": "sa-name", "Variable": "serviceAccount.name", "Settings": { "Default": null } }] }] }, { "Name": "alt", "Label": "Bonus Settings", "Sections": [{ "Name": "main", "ShowIf": "", "Contents": [{ "Type": "heading", "Label": "🚀 Bonus Porter Settings", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "subtitle", "Label": "Configure more aspects of Hello Porter", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "checkbox", "Label": "Enable Autoscaling?", "Name": "autoscaling-enabled", "Variable": "autoscaling.enabled", "Settings": { "Default": false } }] }, { "Name": "autoscaling-options", "ShowIf": "autoscaling-enabled", "Contents": [{ "Type": "number-input", "Label": "Minimum Replicas", "Name": "min-replicas", "Variable": "autoscaling.minReplicas", "Settings": { "Default": 0 } }, { "Type": "number-input", "Label": "Maximum Replicas", "Name": "max-replicas", "Variable": "autoscaling.maxReplicas", "Settings": { "Default": 2 } }] }] }, { "Name": "notes", "Label": "Notes", "Sections": [{ "Name": "main", "ShowIf": "", "Contents": [{ "Type": "heading", "Label": "Just some text", "Name": "", "Variable": "", "Settings": { "Default": null } }, { "Type": "subtitle", "Label": "This is just some random text to populate the final tab with.", "Name": "", "Variable": "", "Settings": { "Default": null } }] }] }
];

// Tabs not display when previewing an old revision
const excludedTabs = ['logs', 'settings', 'deploy'];

/*
  TODO: consolidate revisionPreview and currentChart (currentChart can just be the initial state)
  In general, tab management for ExpandedChart should be refactored. Cases to handle:
  - Hiding logs, deploy, and settings tabs when previewing old charts
  - Toggling additional DevOps tabs
  - Handling the currently selected tab becoming hidden (for both preview and DevOps)
  As part of consolidating currentChart and revisionPreview, can add an isPreview bool.
*/
export default class ExpandedChart extends Component<PropsType, StateType> {
  state = {
    showRevisions: false,
    components: [] as ResourceType[],
    podSelectors: [] as string[],
    revisionPreview: null as (ChartType | null),
    devOpsMode: false,
    tabOptions: [] as ChoiceType[],
    tabContents: [] as any,
    checkTabExists: false,
  }

  updateResources = () => {
    let { currentCluster, currentProject } = this.context;
    let { currentChart } = this.props;

    api.getChartComponents('<token>', {
      namespace: currentChart.namespace,
      cluster_id: currentCluster.id,
      service_account_id: currentCluster.service_account_id,
      storage: StorageType.Secret
    }, {
      id: currentProject.id,
      name: currentChart.name,
      revision: currentChart.version
    }, (err: any, res: any) => {
      if (err) {
        // console.log(err)
      } else {
        this.setState({ components: res.data.Objects, podSelectors: res.data.PodSelectors }, this.refreshTabs);
      }
    });
  }

  getFormData = (): any => {
    let { files } = this.props.currentChart.chart;
    for (const file of files) { 
      if (file.name === 'form.yaml') {
        let formData = yaml.load(Base64.decode(file.data));
        return formData;
      }
    };
    return null;
  }

  refreshTabs = () => {
    let formData = this.getFormData();
    let tabOptions = [] as ChoiceType[];
    let tabContents = [] as any;

    // Generate form tabs if form.yaml exists
    if (formData && formData.tabs) {
      formData.tabs.map((tab: any, i: number) => {
        tabOptions.push({ value: '@' + tab.name, label: tab.label });
        tabContents.push({
          value: '@' + tab.name,
          component: (
            <ValuesFormWrapper>
              <ValuesForm 
                sections={tab.sections} 
                onSubmit={(x: any) => console.log(x)}
              />
            </ValuesFormWrapper>
          ),
        });
      });
    }

    // Append universal tabs
    tabOptions.push(
      { label: 'Logs', value: 'logs' },
      { label: 'Deploy', value: 'deploy' },
      { label: 'Settings', value: 'settings' },
    );

    if (this.state.devOpsMode) {
      tabOptions.push(
        { label: 'Chart Overview', value: 'graph' },
        { label: 'Search Chart', value: 'list' },
        { label: 'Raw Values', value: 'values' }
      );
    }

    let { currentChart, refreshChart, setSidebar } = this.props;
    let chart = this.state.revisionPreview || currentChart;
    tabContents.push(
      {
        value: 'logs', component: (
          <LogSection selectors={this.state.podSelectors} />
        ),
      },
      {
        value: 'deploy', component: (
          <Unimplemented>Coming soon.</Unimplemented> 
        ),
      },
      {
        value: 'settings', component: (
          <SettingsSection /> 
        ),
      },
      {
        value: 'graph', component: (
          <GraphSection
            components={this.state.components}
            currentChart={chart}
            setSidebar={setSidebar}

            // Handle resize YAML wrapper
            showRevisions={this.state.showRevisions}
          />
        ),
      },
      {
        value: 'list', component: (
          <ListSection
            currentChart={chart}
            components={this.state.components}
          />
        ),
      },
      {
        value: 'values', component: (
          <ValuesYaml
            currentChart={chart}
            refreshChart={refreshChart}
          />
        ),
      },
    );
    this.setState({ tabOptions, tabContents });
  }

  componentDidMount() {
    this.updateResources();
  }

  componentDidUpdate(prevProps: PropsType) {
    if (this.props.currentChart !== prevProps.currentChart) {
      this.updateResources();
    }
  }

  setRevisionPreview = (oldChart: ChartType) => {
    let { currentCluster, currentProject } = this.context;
    this.setState({ revisionPreview: oldChart, checkTabExists: true });

    if (oldChart) {
      api.getChartComponents('<token>', {
        namespace: oldChart.namespace,
        cluster_id: currentCluster.id,
        service_account_id: currentCluster.service_account_id,
        storage: StorageType.Secret
      }, {
        id: currentProject.id,
        name: oldChart.name,
        revision: oldChart.version
      }, (err: any, res: any) => {
        if (err) {
          console.log(err)
        } else {
          this.setState({ components: res.data.Objects, podSelectors: res.data.PodSelectors }, this.refreshTabs);
        }
      });
    } else {
      this.setState({ checkTabExists: false });
      this.updateResources();
    }
  }

  // TODO: consolidate with pop + push in refreshTabs
  toggleDevOpsMode = () => {
    if (this.state.devOpsMode) {
      let { tabOptions } = this.state;
      tabOptions.pop();
      tabOptions.pop();
      tabOptions.pop();
      this.setState({ devOpsMode: false, checkTabExists: true, tabOptions });
    } else {
      let { tabOptions } = this.state;
      tabOptions.push(
        { label: 'Chart Overview', value: 'graph' },
        { label: 'Search Chart', value: 'list' },
        { label: 'Raw Values', value: 'values' }
      );
      this.setState({ devOpsMode: true, tabOptions, checkTabExists: false });
    }
  }

  renderIcon = () => {
    let { currentChart } = this.props;

    if (currentChart.chart.metadata.icon && currentChart.chart.metadata.icon !== '') {
      return <Icon src={currentChart.chart.metadata.icon} />
    } else {
      return <i className="material-icons">tonality</i>
    }
  }

  readableDate = (s: string) => {
    let ts = new Date(s);
    let date = ts.toLocaleDateString();
    let time = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${time} on ${date}`;
  }

  render() {
    let { currentChart, setCurrentChart, refreshChart } = this.props;
    let chart = this.state.revisionPreview || currentChart;

    return ( 
      <div>
        <CloseOverlay onClick={() => setCurrentChart(null)}/>
        <StyledExpandedChart>
          <HeaderWrapper>
            <TitleSection>
              <Title>
                <IconWrapper>{this.renderIcon()}</IconWrapper>{chart.name}
              </Title>

              <InfoWrapper>
                <StatusIndicator>
                  <StatusColor status={chart.info.status} />{chart.info.status}
                </StatusIndicator>
                <LastDeployed>
                  <Dot>•</Dot>Last deployed
                  {this.readableDate(chart.info.last_deployed)}
                </LastDeployed>
              </InfoWrapper>

              <TagWrapper>
                Namespace <NamespaceTag>{chart.namespace}</NamespaceTag>
              </TagWrapper>
            </TitleSection>

            <CloseButton onClick={() => setCurrentChart(null)}>
              <CloseButtonImg src={close} />
            </CloseButton>

            <RevisionSection
              showRevisions={this.state.showRevisions}
              toggleShowRevisions={() => this.setState({ showRevisions: !this.state.showRevisions })}
              chart={chart}
              refreshChart={refreshChart}
              setRevisionPreview={this.setRevisionPreview}
            />
          </HeaderWrapper>

          <TabRegion
            options={this.state.tabOptions.filter((opt: any) => {
              return !this.state.revisionPreview || !excludedTabs.includes(opt.value);
            })}
            tabContents={this.state.tabContents}
            checkTabExists={this.state.checkTabExists}
            color={this.state.revisionPreview ? '#f5cb42' : null}
            addendum={
              <TabButton onClick={this.toggleDevOpsMode} devOpsMode={this.state.devOpsMode}>
                <i className="material-icons">offline_bolt</i> DevOps Mode
              </TabButton>
            }
          />
        </StyledExpandedChart>
      </div>
    );
  }
}

ExpandedChart.contextType = Context;

const ValuesFormWrapper = styled.div`
  width: 100%;
  height: 100%;
  padding-bottom: 60px;
`;

const Unimplemented = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  padding-bottom: 20px;
  font-size: 13px;
  font-family: 'Work Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
`;

const TabButton = styled.div`
  position: absolute;
  right: 0px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${(props: { devOpsMode: boolean }) => props.devOpsMode ? '#aaaabb' : '#aaaabb55'};
  margin-left: 35px;
  border-radius: 20px;
  text-shadow: 0px 0px 8px ${(props: { devOpsMode: boolean }) => props.devOpsMode ? '#ffffff66' : 'none'};
  cursor: pointer;
  :hover {
    color: ${(props: { devOpsMode: boolean }) => props.devOpsMode ? '' : '#aaaabb99'};
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
`;

const HeaderWrapper = styled.div`
`;

const StatusColor = styled.div`
  margin-bottom: 1px;
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) => (props.status === 'deployed' ? '#4797ff' : props.status === 'failed' ? "#ed5f85" : "#f5cb42")};
  border-radius: 20px;
  margin-right: 16px;
`;

const Dot = styled.div`
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 6px;
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
  background: #26282E;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454A;
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

const StatusIndicator = styled.div`
  display: flex;
  height: 20px;
  font-size: 13px;
  flex-direction: row;
  text-transform: capitalize;
  align-items: center;
  font-family: 'Hind Siliguri', sans-serif;
  color: #aaaabb;
  animation: fadeIn 0.5s;

  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
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
  background: red;
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;;
  border-radius: 10px;
  background: #26282f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px; 
  display: flex;
  flex-direction: column;

  @keyframes floatIn {
    from { opacity: 0; transform: translateY(30px) }
    to { opacity: 1; transform: translateY(0px) }
  }
`;