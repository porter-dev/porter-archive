import React, { Component } from 'react';
import styled from 'styled-components';
import { Context } from '../../../../../shared/Context';

interface Pod {
  namespace?: string;
  name?: string;
}

type PropsType = {
  selectedPod: Pod,
};

type StateType = {
  logs: string[],
  ws: any
};

export default class Logs extends Component<PropsType, StateType> {
  
  state = {
    logs: [] as string[],
    ws : null as any
  }

  scrollRef = React.createRef<HTMLDivElement>()

  scrollToBottom = () => {
    this.scrollRef.current.scrollTop = this.scrollRef.current.scrollHeight
  }

  renderLogs = () => {
    let { selectedPod } = this.props;
    if (!selectedPod.name) {
      return <div>no bueno, select pod pl0x</div>
    }
    return this.state.logs.map((log, i) => {
        return <div key={i}>{log}</div>
    })
  }

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    let { selectedPod } = this.props;
    if (!selectedPod.name) return

    let ws = new WebSocket(`ws://localhost:8080/api/projects/${currentProject.id}/k8s/${selectedPod.namespace}/pod/${selectedPod.name}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`)

    this.setState({ ws }, () => {
      if (!this.state.ws) return;
  
      this.state.ws.onopen = () => {
        console.log('connected to websocket')
      }
  
      this.state.ws.onmessage = (evt: MessageEvent) => {
        this.setState({ logs: [...this.state.logs, evt.data] }, () => {
          this.scrollToBottom()
        })
      }
  
      this.state.ws.onerror = (err: ErrorEvent) => {
        console.log(err)
      }
    })
  }

  componentWillUnmount() {
    if (this.state.ws) {
      this.state.ws.close()
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
  overflow: auto;
  width: 65%;
  float: right;
  height: 100%;
  background: #202227;
  padding: 25px;
  user-select: text;
  overflow: auto;
  border-radius: 5px;
`;