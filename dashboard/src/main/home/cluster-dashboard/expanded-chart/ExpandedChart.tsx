import React, { Component } from 'react';
import styled from 'styled-components';
import yaml from 'js-yaml';
import close from '../../../../assets/close.png';
import _ from 'lodash';

import { ResourceType, ChartType, StorageType, Cluster } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import TabRegion from '../../../../components/TabRegion';
import RevisionSection from './RevisionSection';
import ValuesYaml from './ValuesYaml';
import GraphSection from './GraphSection';
import ListSection from './ListSection';
import StatusSection from './status/StatusSection';
import ValuesWrapper from '../../../../components/values-form/ValuesWrapper';
import ValuesForm from '../../../../components/values-form/ValuesForm';
import SettingsSection from './SettingsSection';

type PropsType = {
  namespace: string,
  currentChart: ChartType,
  currentCluster: Cluster,
  setCurrentChart: (x: ChartType | null) => void,
  setSidebar: (x: boolean) => void,
  setCurrentView: (x: string) => void,
};

type StateType = {
  loading: boolean,
  showRevisions: boolean,
  components: ResourceType[],
  podSelectors: string[]
  isPreview: boolean,
  devOpsMode: boolean,
  tabOptions: any[],
  tabContents: any,
  currentTab: string | null,
  saveValuesStatus: string | null,
  forceRefreshRevisions: boolean, // Update revisions after upgrading values
};

export default class ExpandedChart extends Component<PropsType, StateType> {
  state = {
    loading: true,
    showRevisions: false,
    components: [] as ResourceType[],
    podSelectors: [] as string[],
    isPreview: false,
    devOpsMode: localStorage.getItem('devOpsMode') === 'true',
    tabOptions: [] as any[],
    tabContents: [] as any,
    currentTab: null as string | null,
    saveValuesStatus: null as (string | null),
    forceRefreshRevisions: false,
  }

  // Retrieve full chart data (includes form and values)
  getChartData = (chart: ChartType) => {
    let { currentProject } = this.context;
    let { currentCluster, setCurrentChart } = this.props;
    this.setState({ loading: true })
    api.getChart('<token>', {
      namespace: this.props.namespace,
      cluster_id: currentCluster.id,
      storage: StorageType.Secret
    }, {
      name: chart.name,
      revision: chart.version,
      id: currentProject.id
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } else {
        setCurrentChart(res.data);
        this.setState({ loading: false });

        // After retrieving full chart data, update tabs and resources
        this.updateTabs();
        this.updateResources();
      }
    });
  }
  
  updateResources = () => {
    let { currentCluster, currentProject } = this.context;
    let { currentChart } = this.props;

    api.getChartComponents('<token>', {
      namespace: currentChart.namespace,
      cluster_id: currentCluster.id,
      storage: StorageType.Secret
    }, {
      id: currentProject.id,
      name: currentChart.name,
      revision: currentChart.version
    }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else {
        this.setState({ components: res.data.Objects, podSelectors: res.data.PodSelectors });
      }
    });
  }

  refreshChart = () => this.getChartData(this.props.currentChart);

  componentDidMount() {
    this.getChartData(this.props.currentChart);
  }

  componentDidUpdate(prevProps: PropsType) {
    /*
    if (this.props.currentChart !== prevProps.currentChart) {
      this.updateResources();
    }
    */
  }

  onSubmit = (rawValues: any) => {
    let { currentProject, currentCluster, setCurrentError } = this.context;

    // Convert dotted keys to nested objects
    let values = {};
    for (let key in rawValues) {
      _.set(values, key, rawValues[key]);
    }

    // Weave in preexisting values and convert to yaml
    let valuesYaml = yaml.dump({ ...(this.props.currentChart.config as Object), ...values });
    
    this.setState({ saveValuesStatus: 'loading' });
    this.refreshChart();
    api.upgradeChartValues('<token>', {
      namespace: this.props.currentChart.namespace,
      storage: StorageType.Secret,
      values: valuesYaml,
    }, {
      id: currentProject.id, 
      name: this.props.currentChart.name,
      cluster_id: currentCluster.id,
    }, (err: any, res: any) => {
      if (err) {
        this.setState({ saveValuesStatus: 'error' });
        console.log(err)
      } else {
        this.setState({ 
          saveValuesStatus: 'successful',
          forceRefreshRevisions: true, 
        });
      }
    });
  }
  
  renderTabContents = () => {
    let { 
      currentTab, 
      podSelectors, 
      components, 
      showRevisions,
      saveValuesStatus,
      tabOptions,
      isPreview,
    } = this.state;
    let { currentChart, setSidebar, setCurrentView } = this.props;
    let chart = currentChart;
    
    switch (currentTab) {
      case 'status': 
        return (
          <StatusSection currentChart={chart} selectors={podSelectors} />
        );
      case 'deploy': 
        return (
          <Unimplemented>Coming soon.</Unimplemented> 
        );
      case 'settings': 
        return (
          <SettingsSection
            currentChart={chart}
            refreshChart={this.refreshChart}
            setCurrentView={setCurrentView}
          /> 
        );
      case 'graph': 
        return (
          <GraphSection
            components={components}
            currentChart={chart}
            setSidebar={setSidebar}

            // Handle resize YAML wrapper
            showRevisions={showRevisions}
          />
        );
      case 'list': 
        return (
          <ListSection
            currentChart={chart}
            components={components}

            // Handle resize YAML wrapper
            showRevisions={showRevisions}
          />
        );
      case 'values': 
        return (
          <ValuesYaml
            currentChart={chart}
            refreshChart={this.refreshChart}
          />
        );
      default:
        if (tabOptions && currentTab && currentTab.includes('@')) {
          return (
            <ValuesWrapper
              formTabs={tabOptions}
              onSubmit={this.onSubmit}
              saveValuesStatus={this.state.saveValuesStatus}
              isInModal={true}
              currentTab={currentTab}
            >
              {
                (metaState: any, setMetaState: any) => {
                  return tabOptions.map((tab: any, i: number) => {

                    // If tab is current, render
                    if (tab.value === currentTab) {
                      return (
                        <ValuesFormWrapper key={i}>
                          <ValuesForm
                            metaState={metaState}
                            setMetaState={setMetaState}
                            sections={tab.sections} 
                          />
                        </ValuesFormWrapper>
                      );
                    }
                  });
                }
              }
            </ValuesWrapper>
          );
        }
    }
  }

  updateTabs() {
    let formData = this.props.currentChart.form;
    let tabOptions = [] as any[];

    // Generate form tabs if form.yaml exists
    if (formData) {
      formData.tabs.map((tab: any, i: number) => {
        tabOptions.push({ value: '@' + tab.name, label: tab.label, sections: tab.sections });
      });
    }

    // Append universal tabs
    tabOptions.push(
      { label: 'Status', value: 'status' },
      //{ label: 'Deploy', value: 'deploy' },
      { label: 'Chart Overview', value: 'graph' },
      { label: 'Settings', value: 'settings' },
    );

    if (this.state.devOpsMode) {
      tabOptions.push(
        { label: 'Manifests', value: 'list' },
        { label: 'Raw Values', value: 'values' }
      );
    }

    // Filter tabs if previewing an old revision
    if (this.state.isPreview) {
      let liveTabs = ['status', 'settings', 'deploy'];
      tabOptions = tabOptions.filter((tab: any) => !liveTabs.includes(tab.value));
    }

    this.setState({ tabOptions });
  }

  setRevision = (chart: ChartType, isCurrent?: boolean) => {
    this.setState({ isPreview: !isCurrent });
    this.getChartData(chart);
  }

  // TODO: consolidate with pop + push in refreshTabs
  toggleDevOpsMode = () => {
    if (this.state.devOpsMode) {
      this.setState({ devOpsMode: false }, () => {
        this.updateTabs();
        localStorage.setItem('devOpsMode', 'false');
      });
    } else {
      this.setState({ devOpsMode: true }, () => {
        this.updateTabs();
        localStorage.setItem('devOpsMode', 'true');
      });
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
    let { currentChart, setCurrentChart } = this.props;
    let chart = currentChart;

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
                  {' ' + this.readableDate(chart.info.last_deployed)}
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
              refreshChart={this.refreshChart}
              setRevision={this.setRevision}
              forceRefreshRevisions={this.state.forceRefreshRevisions}
              refreshRevisionsOff={() => this.setState({ forceRefreshRevisions: false })}
            />
          </HeaderWrapper>

          <TabRegion
            currentTab={this.state.currentTab}
            setCurrentTab={(x: string) => this.setState({ currentTab: x })}
            options={this.state.tabOptions}
            color={this.state.isPreview ? '#f5cb42' : null}
            addendum={
              <TabButton onClick={this.toggleDevOpsMode} devOpsMode={this.state.devOpsMode}>
                <i className="material-icons">offline_bolt</i> DevOps Mode
              </TabButton>
            }
          >
            {this.renderTabContents()}
          </TabRegion>
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
  background: linear-gradient(to right, #26282f00, #26282f 20%);
  padding-left: 30px;
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
  left: 25px;
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