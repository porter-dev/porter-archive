import React, { Component } from 'react';
import styled from 'styled-components';
import close from '../../../../assets/close.png';

import { ResourceType, ChartType, StorageType } from '../../../../shared/types';
import { Context } from '../../../../shared/Context';
import api from '../../../../shared/api';

import TabSelector from '../../../../components/TabSelector';
import RevisionSection from './RevisionSection';
import ValuesYaml from './ValuesYaml';
import GraphSection from './GraphSection';
import ListSection from './ListSection';
import LogSection from './LogSection';
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
  currentTab: string,
  components: ResourceType[],
  revisionPreview: ChartType | null,
  devOpsMode: boolean
};

const tabOptions = [
  { label: 'Chart Overview', value: 'graph' },
  { label: 'Search Chart', value: 'list' },
  { label: 'Raw Values', value: 'values' },
  { label: 'Detailed Logs', value: 'detailed-logs' },
  { label: 'Deploy', value: 'deploy' },
  { label: 'Settings', value: 'settings' },
];

const basicOptions = [
  { label: 'Values', value: 'values-form' },
  { label: 'Environment', value: 'environment' },
  { label: 'Logs', value: 'logs' },
  { label: 'Deploy', value: 'deploy' },
  { label: 'Settings', value: 'settings' },
];

// FormYAML represents a chart's values.yaml form abstraction
export interface FormYAML {
	Name?: string,  
	Icon?: string,   
	Description?: string,   
	Tags?: string[],
  Sections?: Section[]
}

export interface Section {
  Name?: string,
  ShowIf?: string,
  Contents: FormElement[]
}

// FormElement represents a form element
export interface FormElement {
  Type: string,
  Label: string,
  Name?: string,
  Variable?: string,
  Settings?: {
    Default?: number | string | boolean,
    Options?: any[],
    Unit?: string
  }
}

const dummyForm = {
  Sections: [
    {
      Name: 'main',
      Contents: [
        {
          Type: 'heading',
          Label: '⚡ Electric feel settings',
          Settings: {}
        },
        {
          Type: 'subtitle',
          Label: 'Shock me like an electric eel',
          Settings: {}
        },
        {
          Type: 'number-input',
          Name: 'voltage',
          Variable: 'volts',
          Label: 'Voltage',
          Settings: {
            Default: 200,
            Unit: 'Volts'
          }
        },
        {
          Type: 'number-input',
          Name: 'batteries',
          Variable: 'batteries',
          Label: 'Batteries',
          Settings: {
            Default: 4,
            Unit: 'AA'
          }
        },
        {
          Type: 'checkbox',
          Name: 'trivia-checkbox',
          Label: 'Show a fun fact?',
          Settings: {
            Default: true
          }
        },
      ]
    },
    {
      Name: 'trivia',
      ShowIf: 'trivia-checkbox',
      Contents: [
        {
          Type: 'heading',
          Label: '🌊 Ocean fact No. 11232',
          Settings: {}
        },
        {
          Type: 'subtitle',
          Label: 'Electric eels can reach huge proportions, exceeding 8 feet in length and 44 pounds in weight.',
          Settings: {}
        }
      ]
    }
  ]
}

// TODO: consolidate revisionPreview and currentChart (currentChart can just be the initial state)
export default class ExpandedChart extends Component<PropsType, StateType> {
  state = {
    showRevisions: false,
    currentTab: 'values-form',
    components: [] as ResourceType[],
    revisionPreview: null as (ChartType | null),
    devOpsMode: false
  }

  updateResources = () => {
    let { currentCluster } = this.context;
    let { currentChart } = this.props;

    api.getChartComponents('<token>', {
      namespace: currentChart.namespace,
      context: currentCluster,
      storage: StorageType.Secret
    }, { name: currentChart.name, revision: currentChart.version }, (err: any, res: any) => {
      if (err) {
        console.log(err)
      } else {
        this.setState({ components: res.data });
      }
    });
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
    let { currentCluster } = this.context;
    this.setState({ revisionPreview: oldChart });

    if (oldChart) {
      api.getChartComponents('<token>', {
        namespace: oldChart.namespace,
        context: currentCluster,
        storage: StorageType.Secret
      }, { name: oldChart.name, revision: oldChart.version }, (err: any, res: any) => {
        if (err) {
          console.log(err)
        } else {
          this.setState({ components: res.data });
        }
      });

      // Handle preview old chart while logs tab is open
      if (this.state.currentTab === 'logs') {
        this.setState({ currentTab: 'values-form' });
      } else if (this.state.currentTab === 'detailed-logs') {
        this.setState({ currentTab: 'graph' });
      }
    }
  }

  toggleDevOpsMode = () => {
    if (this.state.devOpsMode) {
      this.setState({ devOpsMode: false, currentTab: 'values-form' });
    } else {
      this.setState({ devOpsMode: true, currentTab: 'graph' });
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

  // Hide certain tabs when previewing old charts
  getTabOptions = () => {
    let options = basicOptions.slice();
    if (this.state.devOpsMode) {
      options = tabOptions.slice();
    }

    if (this.state.revisionPreview) {
      options.pop();
      options.pop();
      options.pop();
    }
    return options;
  }

  renderTabContents = () => {
    let { currentChart, refreshChart, setSidebar } = this.props;
    let chart = currentChart;
    if (this.state.revisionPreview) {
      chart = this.state.revisionPreview;
    }
    
    if (this.state.currentTab === 'graph') {
      return (
        <GraphSection
          components={this.state.components}
          currentChart={chart}
          setSidebar={setSidebar}

          // Handle resize YAML wrapper
          showRevisions={this.state.showRevisions}
        />
      );
    } else if (this.state.currentTab === 'list') {
      return (
        <ListSection
          currentChart={chart}
          components={this.state.components}
        />
      );
    } else if (this.state.currentTab === 'values') {
      return (
        <ValuesYaml
          currentChart={chart}
          refreshChart={refreshChart}
        />
      );
    } else if (this.state.currentTab === 'logs') {
      return (
        <LogSection
        />
      );
    } else if (this.state.currentTab === 'values-form') {
      return (
        <ValuesFormWrapper>
          <ValuesForm formData={dummyForm} />
        </ValuesFormWrapper>
      );
    } else if (this.state.currentTab === 'settings') {
      return (
        <SettingsSection />
      );
    }

    return (
      <Unimplemented>(Unimplemented)</Unimplemented>
    );
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
                <IconWrapper>
                  {this.renderIcon()}
                </IconWrapper>
                {chart.name}
              </Title>
              <InfoWrapper>
                <StatusIndicator>
                  <StatusColor status={chart.info.status} />
                  {chart.info.status}
                </StatusIndicator>

                <LastDeployed>
                  <Dot>•</Dot>Last deployed {this.readableDate(chart.info.last_deployed)}
                </LastDeployed>
              </InfoWrapper>

              <TagWrapper>
                Namespace
                <NamespaceTag>
                  {chart.namespace}
                </NamespaceTag>
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

            <TabSelectorWrapper>
              <TabSelector
                options={this.getTabOptions()}
                color={this.state.revisionPreview ? '#f5cb42' : null}
                currentTab={this.state.currentTab}
                setCurrentTab={(value: string) => this.setState({ currentTab: value })}
                addendum={
                  <TabButton onClick={this.toggleDevOpsMode} devOpsMode={this.state.devOpsMode}>
                    <i className="material-icons">offline_bolt</i> DevOps Mode
                  </TabButton>
                }
              />
            </TabSelectorWrapper>

          </HeaderWrapper>
          <ContentSection>
            {this.renderTabContents()}
          </ContentSection>
        </StyledExpandedChart>
      </div>
    );
  }
}

ExpandedChart.contextType = Context;

const ValuesFormWrapper = styled.div`
  width: 100%;
  height: calc(100% - 60px);
  margin-bottom: 60px;
`;

const Unimplemented = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  padding-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const TabSelectorWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 7px;
`;

const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const HeaderWrapper = styled.div`
  margin-bottom: 20px;
`;

const ContentSection = styled.div`
  display: flex;
  border-radius: 5px;
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  overflow-y: auto;
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