import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { InfraType } from "shared/types";
import { RouteComponentProps, withRouter } from "react-router";

import ansiparse from "shared/ansiparser";
import loading from "assets/loading.gif";
import warning from "assets/warning.png";

type PropsType = RouteComponentProps & {
  selectedInfra: InfraType;
};

type StateType = {
  logs: string[];
  ws: any;
  scroll: boolean;
  maxStep: number;
  error: boolean;
};

class ProvisionerLogs extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    ws: null as any,
    scroll: true,
    maxStep: 0,
    error: false,
  };

  ws = null as any;
  parentRef = React.createRef<HTMLDivElement>();

  scrollToBottom = () => {
    this.parentRef.current.lastElementChild.scrollIntoView({
      behavior: "auto",
    });
  };

  renderLogs = () => {
    let { selectedInfra } = this.props;
    let { logs, maxStep } = this.state;
    if (!selectedInfra) {
      return <Message>Please select a resource.</Message>;
    }

    if (selectedInfra.status == "destroyed") {
      return (
        <Message>
          This resource has been auto-destroyed due to an error during
          provisioning.
          <div>
            Please check with your cloud provider to make sure all resources
            have been properly destroyed.
          </div>
        </Message>
      );
    }

    if (logs.length == 0) {
      switch (selectedInfra.status) {
        case "creating":
          return (
            <Loading>
              <LoadingGif src={loading} /> Provisioning resources...
            </Loading>
          );
        case "destroying":
          return (
            <Message>
              <LoadingGif src={loading} /> Destroying resources...
            </Message>
          );
        case "error":
          return (
            <Message>
              Porter encountered an error while provisioning this resource.
            </Message>
          );
        default:
          return <Message>{selectedInfra.status}</Message>;
      }
    }

    let count = 0;
    return logs.map((log, i) => {
      if (log.trim().length != 0) {
        count += 1;
        return <Log key={i + 1}>{`[Step ${count}/${maxStep}] ` + log}</Log>;
      }
    });
  };

  isJSON = (str: string) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  setupWebsocket = () => {
    this.ws.onopen = () => {
      console.log("connected to websocket");
    };

    this.ws.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let validEvents = [] as any[];
      let err = null;

      for (var i = 0; i < event.length; i++) {
        let msg = event[i];
        if (
          msg["Values"] &&
          msg["Values"]["data"] &&
          this.isJSON(msg["Values"]["data"])
        ) {
          let d = JSON.parse(msg["Values"]["data"]);

          if (d["kind"] == "error") {
            err = d["log"];
            break;
          }

          // add only valid events
          if (
            d["log"] != null &&
            d["created_resources"] != null &&
            d["total_resources"] != null
          ) {
            validEvents.push(d);
          }
        }
      }

      if (err) {
        window.analytics.track("Provisioning Error", {
          error: err,
        });
        let e = ansiparse(err).map((el: any) => {
          return el.text;
        });

        this.setState({ logs: [...this.state.logs, ...e], error: true });
        return;
      }

      if (validEvents.length == 0) {
        return;
      }

      let logs = [] as any[];
      validEvents.forEach((e: any) => {
        logs.push(...ansiparse(e["log"]));
      });

      logs = logs.map((log: any) => {
        return log.text;
      });

      this.setState(
        {
          logs: [...this.state.logs, ...logs],
          maxStep: validEvents[validEvents.length - 1]["total_resources"],
        },
        () => {
          this.scrollToBottom();
        }
      );
    };

    this.ws.onerror = (err: ErrorEvent) => {
      console.log("websocket err", err);
    };

    this.ws.onclose = () => {
      console.log("closing provisioner websocket");
    };
  };

  componentDidMount() {
    let { currentProject } = this.context;
    let { selectedInfra } = this.props;

    if (!selectedInfra) return;

    let protocol = process.env.NODE_ENV == "production" ? "wss" : "ws";
    this.ws = new WebSocket(
      `${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/provision/${selectedInfra.kind}/${selectedInfra.id}/logs`
    );

    this.setupWebsocket();
    this.scrollToBottom();
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }

  render() {
    return (
      <LogStream>
        <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
      </LogStream>
    );
  }
}

ProvisionerLogs.contextType = Context;
export default withRouter(ProvisionerLogs);

const Loading = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: #ffffff44;
  font-size: 13px;
`;

const LoadingGif = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 9px;
  margin-bottom: 0px;
`;

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
  flex-direction: column;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  font-size: 13px;
`;

const Log = styled.div`
  font-family: monospace;
  font-size: 12px;
`;
