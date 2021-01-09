import React, { Component } from 'react';
import styled from 'styled-components';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import ansiparse from '../../../shared/ansiparser'
import { integrationList } from '../../../shared/common';
import loading from '../../../assets/loading.gif';
import warning from '../../../assets/warning.png';

import Helper from '../../../components/values-form/Helper';
import { eventNames } from 'process';
import { inflateRaw, inflateRawSync } from 'zlib';

type PropsType = {
  viewData: any,
  setCurrentView: (x: string) => void,
};

type StateType = {
  error: boolean,
  logs: string[],
  websockets: any[],
  maxStep : Record<string, number>,
  currentStep: Record<string, number>,
};

export default class Provisioner extends Component<PropsType, StateType> {
  state = {
    error: false,
    logs: [] as string[],
    websockets : [] as any[],
    maxStep: {} as Record<string, any>,
    currentStep: {} as Record<string, number>,
  }

  scrollToBottom = () => {
    this.scrollRef.current.scrollTop = this.scrollRef.current.scrollHeight
  }

  isJSON = (str: string) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  setupWebsocket = (ws: WebSocket, infra: any) => {
    ws.onopen = () => {
      console.log('connected to websocket')
    }

    ws.onmessage = (evt: MessageEvent) => {
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
        let e = ansiparse(err).map((el: any) => {
          return el.text;
        })
        this.setState({ logs: e, error: true });
        return;
      }

      if (validEvents.length == 0) {
        return;
      }
      
      if (!this.state.maxStep[infra.kind] || !this.state.maxStep[infra.kind]["total_resources"]) {
        console.log('setting max step for ', infra.kind)
        this.setState({
          maxStep: {
            ...this.state.maxStep,
            [infra.kind] : validEvents[validEvents.length - 1]["total_resources"]
          }
        })
      }
      
      let logs = [] as any[]
      validEvents.forEach((e: any) => {
        logs.push(...ansiparse(e["log"]))
      })

      logs = logs.map((log: any) => {
        return log.text
      })

      this.setState({ 
        logs: [...this.state.logs, ...logs], 
        currentStep: {
          ...this.state.currentStep,
          [infra.kind] : validEvents[validEvents.length - 1]["created_resources"]
        },
      }, () => {
        this.scrollToBottom()
      })
    }

    ws.onerror = (err: ErrorEvent) => {
      console.log(err)
    }

    ws.onclose = () => {
      console.log('closing provisioner websocket')
    }

    return ws
  }

  componentDidMount() {
    let { currentProject } = this.context;
    let protocol = process.env.NODE_ENV == 'production' ? 'wss' : 'ws'
    let viewData = this.props.viewData || []

    let websockets = viewData.map((infra: any) => {
      let ws = new WebSocket(`${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/provision/${infra.kind}/${infra.infra_id}/logs`)
      return this.setupWebsocket(ws, infra)
    });

    viewData.forEach(async (infra: any) => {
      await new Promise((next: (res?: any) => void) => {
        if (!this.state.maxStep[infra.kind] || !this.state.maxStep[infra.kind]["total_resources"]) {
          this.setState({
            maxStep: {
              ...this.state.maxStep,
              [infra.kind] : 10
            }
          }, () => {
            next()
          })
        }
      })
    })

    this.setState({ websockets, logs: [] });
  }

  componentWillUnmount() {
    console.log('component will unmount', this.state.websockets)
    if (!this.state.websockets) { return; }

    this.state.websockets.forEach((ws: any) => {
      ws.close()
    })
  }

  scrollRef = React.createRef<HTMLDivElement>();

  renderLogs = () => {
    return this.state.logs.map((log, i) => {
      return <div key={i}>{log}</div>
    });
  }

  renderHeadingSection = () => {
    if (this.state.error) {
      return (
        <>
          <TitleSection>
            <Title><img src={warning} /> Provisioning Error</Title>
          </TitleSection>

          <Helper>
            Porter encountered an error while provisioning.
            <Link onClick={() => this.props.setCurrentView('dashboard')}>
              Exit to dashboard
            </Link> 
            to try again with new credentials.
          </Helper>
        </>
      );
    }

    return (
      <>
        <TitleSection>
          <Title><img src={loading} /> Setting Up Porter</Title>
        </TitleSection>

        <Helper>
          Porter is currently being provisioned to your AWS account:
        </Helper>
      </>
    )
  }
  
  render() {
    console.log("maxStep", this.state.maxStep)
    let maxStep = 0;
    let currentStep = 0;

    for (let key in this.state.maxStep) {
      console.log(key)
      maxStep += this.state.maxStep[key]
    }

    for (let key in this.state.currentStep) {
      currentStep += this.state.currentStep[key]
    }

    if (maxStep !== 0 && currentStep === maxStep) {
      console.log('Thinks provisioning complete.')
      console.log(currentStep, maxStep);
      this.props.setCurrentView('dashboard');
    }

    return (
      <StyledProvisioner>
        {this.renderHeadingSection()}

        <LoadingBar>
          <Loaded progress={((currentStep / (maxStep == 0 ? 1 : maxStep)) * 100).toString() + '%'} />
        </LoadingBar>

        <LogStream ref={this.scrollRef}>
          <Wrapper>
            {this.renderLogs()}
          </Wrapper>
        </LogStream>

        <Helper>
          (Provisioning usually takes around 15 minutes)
        </Helper>
      </StyledProvisioner>
    );
  }
}

Provisioner.contextType = Context;

const Link = styled.a`
  cursor: pointer;
  margin-left: 5px;
  margin-right: 5px;
`;

const Warning = styled.span`
  color: ${(props: { highlight: boolean, makeFlush?: boolean }) => props.highlight ? '#f5cb42' : ''};
  margin-left: ${(props: { highlight: boolean, makeFlush?: boolean }) => props.makeFlush ? '' : '5px'};
  margin-right: 5px;
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px 25px;
`;

const LogStream = styled.div`
  height: 300px;
  margin-top: 30px;
  font-size: 13px;
  border: 2px solid #ffffff55;
  border-radius: 10px;
  width: 100%;
  background: #00000022;
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

const Loaded = styled.div`
  width: ${(props: { progress: string }) => props.progress};
  height: 100%;
  background: linear-gradient(to right, #4f8aff, #8e7dff, #4f8aff);
  background-size: 400% 400%;

  animation: linkLoad 2s infinite;

  @keyframes linkLoad {
    0%{background-position:91% 100%}
    100%{background-position:10% 0%}
  }
`;

const LoadingBar = styled.div`
  width: 100%;
  margin-top: 24px;
  overflow: hidden;
  height: 20px;
  background: #ffffff11;
  border-radius: 30px;
`;

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: 'Work Sans', sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  > img {
    width: 20px;
    margin-right: 10px;
    margin-bottom: -2px;
  }
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;

  > a {
    > i {
      display: flex;
      align-items: center;
      margin-bottom: -2px;
      font-size: 18px;
      margin-left: 18px;
      color: #858FAAaa;
      cursor: pointer;
      :hover {
        color: #aaaabb;
      }
    }
  }
`;

const StyledProvisioner = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  height: 600px;
  position: relative;
  padding-top: 50px;
  margin-top: calc(50vh - 350px);
`;