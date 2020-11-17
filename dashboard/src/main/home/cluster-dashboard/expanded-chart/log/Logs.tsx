import React, { Component } from 'react';
import styled from 'styled-components';
import { Context } from '../../../../../shared/Context';

type PropsType = {
  selectedPod: string,
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
    return this.state.logs.map((log, i) => {
        return <div key={i}>{log}</div>
    })
  }

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    if (!this.props.selectedPod) return

    let ws = new WebSocket(`ws://localhost:8080/api/projects/${currentProject.id}/k8s/default/pod/${this.props.selectedPod}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`)
    // let ws = new WebSocket(`ws://localhost:8080/api/projects/${currentProject.id}/k8s/deployment/status?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`)
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
      console.log('unmounting')
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
  width: 70%;
  height: 100%;
  background: #202227;
  position: relative;
  padding: 25px;
  user-select: text;
  overflow: auto;
`;