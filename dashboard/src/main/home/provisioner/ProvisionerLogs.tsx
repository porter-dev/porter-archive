import React, { Component } from 'react';
import styled from 'styled-components';
import { Context } from 'shared/Context';
import { InfraType } from 'shared/types';
import posthog from 'posthog-js';

import ansiparse from 'shared/ansiparser'
import loading from 'assets/loading.gif';
import warning from 'assets/warning.png';

type PropsType = {
  selectedInfra: InfraType,
};

type StateType = {
  logs: string[],
  ws: any,
  scroll: boolean,
  maxStep: number,
  currentStep: number,
};

export default class Logs extends Component<PropsType, StateType> {
  
  state = {
    logs: [] as string[],
    ws : null as any,
    scroll: true,
    maxStep: 0,
    currentStep: 0,
  }

  ws = null as any;
  parentRef = React.createRef<HTMLDivElement>()

  scrollToBottom = () => {
    this.parentRef.current.lastElementChild.scrollIntoView({ behavior: "auto" })
  }

  renderLogs = () => {
    let { selectedInfra } = this.props;
    if (!selectedInfra) {
      return <Message>Please select a pod to view its logs.</Message>
    }
    if (this.state.logs.length == 0) {
      return <Message>No logs to display from this pod.</Message>
    }
    return this.state.logs.map((log, i) => {
        return <Log key={i}>{log}</Log>
    })
  }

  isJSON = (str: string) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  setupWebsocket = () => {
    let { selectedInfra }= this.props;
    this.ws.onopen = () => {
      console.log('connected to websocket')
    }

    this.ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let validEvents = [] as any[];
      let err = null;
      
      for (var i = 0; i < event.length; i++) {
        let msg = event[i];
        if (msg["Values"] && msg["Values"]["data"] && this.isJSON(msg["Values"]["data"])) { 
          let d = JSON.parse(msg["Values"]["data"]);

          if (d["kind"] == "error") {
            err = d["log"];
            break;
          }

          // add only valid events
          if (d["log"] != null && d["created_resources"] != null && d["total_resources"] != null) {
            validEvents.push(d);
          }
        }
      }

      if (err) {
        posthog.capture('Provisioning Error', {error: err});

        let e = ansiparse(err).map((el: any) => {
          return el.text;
        })

        this.setState({ logs: [...this.state.logs, ...e] });
        return;
      }

      if (validEvents.length == 0) {
        return;
      }

      this.setState({
          maxStep: validEvents[validEvents.length - 1]["total_resources"]
      })
      
      let logs = [] as any[]
      validEvents.forEach((e: any) => {
        logs.push(...ansiparse(e["log"]))
      })

      logs = logs.map((log: any) => {
        return log.text
      })

      this.setState({ 
        logs: [...this.state.logs, ...logs], 
        currentStep: validEvents[validEvents.length - 1]["created_resources"],
      }, () => {
        this.scrollToBottom()
      })
    }

    this.ws.onerror = (err: ErrorEvent) => {
      console.log('websocket err', err)
    }

    this.ws.onclose = () => {
      console.log('closing provisioner websocket')
    }
  }

  componentDidMount() {
    this.setupWebsocket()
    this.scrollToBottom();
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.close()
    }
  }

  render() {
    return (
      <LogStream>
        <Wrapper ref={this.parentRef}>
          {this.renderLogs()}
        </Wrapper>
      </LogStream>
    );
  }
}

Logs.contextType = Context;

const Scroll = styled.div`
  align-items: center;
  display: flex;
  cursor: pointer;
  width: 145px;
  height: 100%;

  :hover {
    background: #2468d6;
  }

  > input {
    width; 18px;
    margin-left: 10px;
    margin-right: 6px;
    pointer-events: none;
  }
`

const Refresh = styled.div`
  display: flex;
  align-items: center;
  width: 87px;
  user-select: none;
  cursor: pointer;
  height: 100%;

  > i {
    margin-left: 6px;
    font-size: 17px;
    margin-right: 6px;
  }

  :hover {
    background: #2468d6;
  }
`

const Options = styled.div`
  width: 100%;
  height: 25px;
  background: #397ae3;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 25px 30px;
`;

const LogStream = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  float: right;
  height: 100%;
  background: #202227;
  user-select: text;
  max-width: 65%;
  overflow-y: auto;
  overflow-wrap: break-word; 
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

const Log = styled.div`
  font-family: monospace;
`;