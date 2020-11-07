import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../../shared/api';
import { ResourceType, ChartType } from '../../../../../shared/types';
import Logs from './Logs';
import { Context } from '../../../../../shared/Context';

type PropsType = {
  selectors: string[],
};

type StateType = {
  logs: string[]
  pods: string[],
  selectedPod: string,
};

export default class LogSection extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    pods: [] as string[],
    selectedPod: null as string,
    matchingPods: [] as any[]
  }

  renderLogs = () => {
    return <Logs key={this.state.selectedPod} selectedPod={this.state.selectedPod} />
  }

  renderPodTabs = () => {
    return this.state.pods.map((pod, i) => {
      return <div key={i}>{pod}</div>
    })
  }

  componentDidMount() {
    const { selectors } = this.props;

    api.getMatchingPods('<token>', { 
      context: this.context.currentCluster,
      selectors,
    }, {}, (err: any, res: any) => {
      this.setState({pods: res.data, selectedPod: res.data[0]})
    })
  }

  render() {
    return (
      <StyledLogSection>
        {this.renderPodTabs()}
        {this.renderLogs()}
      </StyledLogSection>
    );
  }
}

LogSection.contextType = Context;


const StyledLogSection = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  padding: 0px;
  user-select: text;
`;