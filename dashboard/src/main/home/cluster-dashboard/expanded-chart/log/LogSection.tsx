import React, { Component } from 'react';
import styled from 'styled-components';
import api from '../../../../../shared/api';
import Logs from './Logs';
import { Context } from '../../../../../shared/Context';

interface Pod {
  namespace?: string;
  name?: string;
}

type PropsType = {
  selectors: string[],
};

type StateType = {
  logs: string[]
  pods: Pod[],
  selectedPod: Pod,
};

export default class LogSection extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    pods: [] as Pod[],
    selectedPod: {} as Pod,
  }

  renderLogs = () => {
    return <Logs key={this.state.selectedPod.name} selectedPod={this.state.selectedPod} />
  }

  renderPodTabs = () => {
    return this.state.pods.map((pod, i) => {
      return (
        <Tab 
          key={i}
          selected={(this.state.selectedPod == pod)} 
          onClick={() => {
          this.setState({selectedPod: pod})
          }
        }>
          {pod.name}
        </Tab>
      )
    })
  }

  componentDidMount() {
    const { selectors } = this.props;
    let { currentCluster, currentProject } = this.context;

    api.getMatchingPods('<token>', { 
      cluster_id: currentCluster.id,
      service_account_id: currentCluster.service_account_id,
      selectors,
    }, {
      id: currentProject.id
    }, (err: any, res: any) => {
      let pods = res?.data?.map((pod: any) => {
        return {
          namespace: pod.metadata.namespace, 
          name: pod.metadata.name
        }
      })
      this.setState({ pods , selectedPod: pods[0]})
    })
  }

  render() {
    return (
      <StyledLogSection>
        <TabWrapper>
          {this.renderPodTabs()}
        </TabWrapper>
        {this.renderLogs()}
      </StyledLogSection>
    );
  }
}

LogSection.contextType = Context;

const TabWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 30%;
  float: left;
`

const Tab = styled.div`
  align-items: center;
  color: ${(props: {selected: boolean}) => props.selected ? 'white' : '#ffffff66'};
  background: ${(props: {selected: boolean}) => props.selected ? '#ffffff18' : '##ffffff11'};
  height: 100%;
  justify-content: center;
  font-size: 13px;
  padding: 15px 13px;
  margin-right: 10px;
  border-radius: 5px;
  text-shadow: 0px 0px 8px none;
  cursor: pointer;
  :hover {
    color: white;
    background: #ffffff18;
  }
`;

const StyledLogSection = styled.span`
  width: 100%;
  height: 100%;
  position: relative;
  padding: 0px;
  user-select: text;
`;