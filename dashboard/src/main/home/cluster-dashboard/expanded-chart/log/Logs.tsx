import React, { Component } from 'react';
import styled from 'styled-components';
import { Context } from '../../../../../shared/Context';

type PropsType = {
  selectedPod: string,
};

type StateType = {
  logs: string[]
};

export default class Logs extends Component<PropsType, StateType> {
  
  state = {
    logs: [] as string[],
  }

  scrollRef = React.createRef<HTMLDivElement>()

  scrollToBottom = () => {
    this.scrollRef.current.scrollTop = this.scrollRef.current.scrollHeight
  }

  renderLogs = () => {
    return this.state.logs.map((log, i) => {
        return <div key={i}>{log}</div>
    })
  }

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    let ws = new WebSocket(`ws://localhost:8080/api/projects/${currentProject.id}/k8s/default/pod/${this.props.selectedPod}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`)

    ws.onopen = () => {
      console.log('connected to websocket')
    }

    ws.onmessage = evt => {
      this.setState({ logs: [...this.state.logs, evt.data] }, () => {
        this.scrollToBottom()
      })
    }
  }

  render() {
    return (
      <LogStream ref={this.scrollRef}>
        {this.renderLogs()}
      </LogStream>
    );
  }
}

Logs.contextType = Context;

const LogStream = styled.div`
  width: 70%;
  height: 100%;
  background: #202227;
  position: relative;
  padding: 25px;
  user-select: text;
  overflow: auto;
`;