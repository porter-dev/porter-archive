import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../../shared/api';
import Logs from './Logs';
import ControllerTab from './ControllerTab';
import { Context } from '../../../../../shared/Context';
import { ChartType, StorageType } from '../../../../../shared/types';

type PropsType = {
  selectors: string[],
  currentChart: ChartType,
};

type StateType = {
  logs: string[]
  pods: any[],
  selectedPod: any,
  controllers: any[],
};

export default class StatusSection extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    pods: [] as any[],
    selectedPod: {} as any,
    controllers: [] as any[],
  }

  renderLogs = () => {
    return <Logs 
      key={this.state.selectedPod?.metadata?.name} 
      selectedPod={this.state.selectedPod} 
    />
  }

  selectPod = (pod: any) => {
    this.setState({
      selectedPod: pod
    })
  }

  renderTabs = () => {
    return this.state.controllers.map((c) => {
      return (
        <ControllerTab 
          key={c.metadata.uid} 
          selectedPod={this.state.selectedPod} 
          selectPod={this.selectPod.bind(this)}
          controller={c}
        />
      )
    })
  }

  renderStatusSection = () => {
    if (this.state.controllers.length > 0) {
      return (
        <Wrapper>
          <TabWrapper>
            {this.renderTabs()}
          </TabWrapper>
          {this.renderLogs()}
        </Wrapper>
      )
    } else {
      return (
        <NoControllers> 
          <i className="material-icons">category</i> 
          No objects to display. This might happen while your app is still deploying.
        </NoControllers>
      )
    }
  }

  componentDidMount() {
    const { selectors, currentChart } = this.props;
    let { currentCluster, currentProject, setCurrentError } = this.context;

    api.getChartControllers('<token>', {
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
        setCurrentError(JSON.stringify(err));
        return
      }
      this.setState({ controllers: res.data })
    });
  }

  render() {
    return (
      <StyledStatusSection>
        {this.renderStatusSection()}
      </StyledStatusSection>
    );
  }
}

StatusSection.contextType = Context;

const TabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: 35%;
  float: left;
  max-height: 100%;
  background: #ffffff11;
`

const StyledStatusSection = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  font-size: 13px;
  padding: 0px;
  user-select: text;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const NoControllers = styled.div`
  padding-top: 20%;
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;

  > i {
    font-size: 18px;
    margin-right: 12px;
  }
`;