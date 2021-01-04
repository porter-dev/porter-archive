import React, { Component } from 'react';
import styled from 'styled-components';
import { Context } from '../../../../../shared/Context';

type PropsType = {
  selectedPod: any,
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
    if (!selectedPod?.metadata?.name) {
      return <Message>Please select a pod to view its logs.</Message>
    }
    if (this.state.logs.length == 0) {
      return <Message>No logs to display from this pod.</Message>
    }
    return this.state.logs.map((log, i) => {
        return <div key={i}>{log}</div>
    })
  }

  componentDidMount() {
    let { currentCluster, currentProject } = this.context;
    let { selectedPod } = this.props;
    if (!selectedPod.metadata?.name) return
    let protocol = process.env.NODE_ENV == 'production' ? 'wss' : 'ws'
    let ws = new WebSocket(`${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/k8s/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`)
    
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
        <Wrapper>
          {this.renderLogs()}
        </Wrapper>
      </LogStream>
    );
  }
}

Logs.contextType = Context;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 25px 30px;
`;

const LogStream = styled.div`
  display: flex;
  flex: 1;
  float: right;
  height: 100%;
  background: #202227;
  user-select: text;
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;
`;