import React, { Component } from 'react';
import styled from 'styled-components';
import posthog from 'posthog-js';

import api from '../../../shared/api';
import { Context } from '../../../shared/Context';
import ansiparse from '../../../shared/ansiparser'
import loading from '../../../assets/loading.gif';
import warning from '../../../assets/warning.png';
import { InfraType } from '../../../shared/types';
import { filterOldInfras } from '../../../shared/common';

import Helper from '../../../components/values-form/Helper';
import InfraStatuses from './InfraStatuses';

type PropsType = {
  setCurrentView: (x: string) => void,
}

type StateType = {
  error: boolean,
  logs: string[],
  websockets: any[],
  maxStep : Record<string, number>,
  currentStep: Record<string, number>,
  triggerEnd: boolean,
  infras: InfraType[],
};

const dummyInfras = [
  { kind: 'ecr', status: 'creating', id: 5, project_id: 1 }, 
  { kind: 'eks', status: 'error', id: 3, project_id: 1 },
  { kind: 'eks', status: 'error', id: 1, project_id: 1 },
  { kind: 'eks', status: 'error', id: 4, project_id: 1 },
  { kind: 'ecr', status: 'created', id: 2, project_id: 1 },
];

export default class ProvisionerStatus extends Component<PropsType, StateType> {
  state = {
    error: false,
    logs: [] as string[],
    websockets : [] as any[],
    maxStep: {} as Record<string, any>,
    currentStep: {} as Record<string, number>,
    triggerEnd: false,
    infras: [] as InfraType[],
  }

  parentRef = React.createRef<HTMLDivElement>()

  scrollToBottom = (smooth: boolean) => {
    if (smooth) {
      this.parentRef.current.lastElementChild.scrollIntoView({ behavior: "smooth" })
    } else {
      this.parentRef.current.lastElementChild.scrollIntoView({ behavior: "auto" })
    }
  }

  componentDidMount() {
    console.log('mounting provisioner')
    let { currentProject } = this.context;
    let protocol = process.env.NODE_ENV == 'production' ? 'wss' : 'ws'

    // Check if current project is provisioning
    api.getInfra('<token>', {}, { 
      project_id: currentProject.id 
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
      } 
      
      let infras = filterOldInfras(res.data);
      let error = false;

      let maxStep = {} as Record<string, number>

      infras.forEach((infra: InfraType, i: number) => {
        maxStep[infra.kind] = null;
        if (infra.status === 'error') {
          error = true;
        }
      });

      // Filter historical infras list for most current instances of each
      let websockets = infras.map((infra: any) => {
        let ws = new WebSocket(`${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/provision/${infra.kind}/${infra.id}/logs`)
        return this.setupWebsocket(ws, infra)
      });
  
      this.setState({ error, infras, websockets, maxStep, logs: ["Provisioning resources..."] });
    });
  }

  componentWillUnmount() {
    if (this.state.websockets.length == 0) { return; }

    this.state.websockets.forEach((ws: any) => {
      ws.close()
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
        posthog.capture('Provisioning Error', {error: err});

        let e = ansiparse(err).map((el: any) => {
          return el.text;
        })

        let index = this.state.infras.findIndex(el => el.kind === infra.kind)
        infra.status = "error"
        let infras = this.state.infras
        infras[index] = infra
        this.setState({ logs: [...this.state.logs, ...e], error: true, infras });
        return;
      }

      if (validEvents.length == 0) {
        return;
      }

      if (!this.state.maxStep[infra.kind] || !this.state.maxStep[infra.kind]["total_resources"]) {
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
        this.scrollToBottom(false)
      })
    }

    ws.onerror = (err: ErrorEvent) => {
      console.log('websocket err', err)
    }

    ws.onclose = () => {
      console.log('closing provisioner websocket')
    }

    return ws
  }

  renderLogs = () => {
    return this.state.logs.map((log, i) => {
      return <Log key={i}>{log}</Log>;
    });
  }

  onEnd = () => {
    let myInterval = setInterval(() => {
      api.getClusters('<token>', {}, { 
        id: this.context.currentProject.id 
      }, (err: any, res: any) => {
        if (err) {
          console.log(err);
        } else if (res.data) {
          let clusters = res.data;
          if (clusters.length > 0) {
            // console.log('response :', res.data);
            this.props.setCurrentView('dashboard');
            // console.log('provision end project: ', this.context.currentProject);
            // console.log('provision end cluster: ', this.context.currentCluster);
            clearInterval(myInterval);
          } else {
            // console.log('looped!')
            // console.log('response :', res.data);
            // console.log('provision end project: ', this.context.currentProject);
            // console.log('provision end cluster: ', this.context.currentCluster);
          }
        }
      });
    }, 1000);
  }

  refreshLogs = () => {
    if (this.state.websockets.length == 0) { return; }
    let { currentProject } = this.context;
    let protocol = process.env.NODE_ENV == 'production' ? 'wss' : 'ws'

    this.state.websockets.forEach((ws: any) => {
      ws.close()
    })

    this.setState({ 
      websockets: [],
      logs: []
    })

    let websockets = this.state.infras.map((infra: any) => {
      let ws = new WebSocket(`${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/provision/${infra.kind}/${infra.infra_id}/logs`)
      return this.setupWebsocket(ws, infra)
    });

    this.setState({ websockets, logs: ["Provisioning resources..."] });
    
  }
  
  render() {
    let { error, triggerEnd, infras } = this.state;
    let { setCurrentView } = this.props;
    
    let maxStep = 0;
    let currentStep = 0;
    let skip = false;
    
    for (let i = 0; i < infras.length; i++) {
      if (!this.state.maxStep[infras[i].kind]) {
        skip = true;
      }
    }

    if (!skip) {
      for (let key in this.state.maxStep) {
        maxStep += this.state.maxStep[key]
        currentStep += this.state.currentStep[key]
      }  
    }

    if (maxStep !== 0 && currentStep === maxStep && !triggerEnd) {
      posthog.capture('Provisioning complete!')
      this.onEnd()
      this.setState({ triggerEnd: true });
    }

    return (
      <StyledProvisioner>
        {error 
          ? (
            <>
              <TitleSection>
                <Title><img src={warning} /> Provisioning Error</Title>
              </TitleSection>
    
              <Helper>
                Porter encountered an error while provisioning.
                <Link onClick={() => setCurrentView('dashboard')}>
                  Exit to dashboard
                </Link> 
                to try again with new credentials.
              </Helper>
            </>
          ) : (
            <>
              <TitleSection>
                <Title><img src={loading} /> Setting Up Porter</Title>
              </TitleSection>
              <Helper>
                Porter is currently provisioning resources in your cloud provider:
              </Helper>
            </>
          )
        }
      
        <LoadingBar>
          <Loaded 
            progress={
              error ? (
                '0%'
              ) : (
                (((currentStep / (maxStep == 0 ? 1 : maxStep)) * 100).toString() + '%')
              )
            }
          />
        </LoadingBar>
        <InfraStatuses infras={infras} />

        <LogStream>
          <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
        </LogStream>

        <Helper>
          (Provisioning usually takes around 15 minutes)
        </Helper>
      </StyledProvisioner>
    );
  }
}

ProvisionerStatus.contextType = Context;

const Options = styled.div`
  width: 100%;
  height: 25px;
  background: #397ae3;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
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

const Log = styled.div`
  font-family: monospace;
`;

const LogStream = styled.div`
  height: 300px;
  margin-top: 20px;
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

const Loaded = styled.div<{ progress: string }>`
  width: ${props => props.progress};
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