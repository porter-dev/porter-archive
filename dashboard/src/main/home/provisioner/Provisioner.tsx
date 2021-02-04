import React, { Component } from 'react';
import styled from 'styled-components';
import posthog from 'posthog-js';

import api from 'shared/api';
import { Context } from 'shared/Context';
import ansiparse from 'shared/ansiparser'
import loading from 'assets/loading.gif';
import warning from 'assets/warning.png';
import { InfraType } from 'shared/types';

import Helper from 'components/values-form/Helper';
import InfraStatuses from './InfraStatuses';
import { RouteComponentProps, withRouter } from "react-router";
import { Link } from "react-router-dom";

type PropsType = RouteComponentProps & {};

type StateType = {
  error: boolean,
  logs: string[],
  websockets: any[],
  maxStep : Record<string, number>,
  currentStep: Record<string, number>,
  triggerEnd: boolean,
  infras: InfraType[],
};

class Provisioner extends Component<PropsType, StateType> {
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
            this.props.history.push("dashboard");
            clearInterval(myInterval);
          }
        }
      });
    }, 1000);
  }

  renderTabs = () => {
    return this.state.infras.map((infra, i) => {
      console.log(infra)
      // return (
      //   <ControllerTab 
      //     key={i} 
      //     selectedPod={this.state.selectedPod} 
      //     selectPod={this.selectPod.bind(this)}
      //     controller={c}
      //     isLast={i === this.state.controllers.length - 1}
      //     isFirst={i === 0}
      //   />
      // )
    })
  }

  componentDidMount() {
    let { currentProject } = this.context;

    // Check if current project is provisioning
    api.getInfra('<token>', {}, { 
      project_id: currentProject.id 
    }, (err: any, res: any) => {
      if (err) return;
      
      let infras = res.data;
      let error = false;
      this.setState({ error, infras });
    });
  }

  render() {
    console.log(this.state.infras)
    return (
      <StyledProvisioner>
        {this.renderTabs()}
        [TODO: implement provisioner]
      </StyledProvisioner>
    );
  }
}

Provisioner.contextType = Context;

export default withRouter(Provisioner);


const StyledProvisioner = styled.div`
  width: 100%;
  height: 350px;
  background: #ffffff11;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  margin-top: 10px;
`;