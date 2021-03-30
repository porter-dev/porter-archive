import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";

type PropsType = {
  selectedPod: any;
  podError: string;
};

type StateType = {
  logs: string[];
  ws: any;
  scroll: boolean;
};

export default class Logs extends Component<PropsType, StateType> {
  state = {
    logs: [] as string[],
    ws: null as any,
    scroll: true,
  };

  ws = null as any;
  parentRef = React.createRef<HTMLDivElement>();

  scrollToBottom = (smooth: boolean) => {
    if (smooth) {
      this.parentRef.current.lastElementChild.scrollIntoView({
        behavior: "smooth",
      });
    } else {
      this.parentRef.current.lastElementChild.scrollIntoView({
        behavior: "auto",
      });
    }
  };

  renderLogs = () => {
    let { selectedPod } = this.props;
    if (!selectedPod?.metadata?.name) {
      return <Message>Please select a pod to view its logs.</Message>;
    }

    if (selectedPod?.status.phase === "Succeeded") {
      return (
        <Message>
          ⌛ This job has been completed. You can now delete this job.
        </Message>
      );
    }

    if (this.state.logs.length == 0) {
      return (
        <Message>
          {this.props.podError || "No logs to display from this pod."}
        </Message>
      );
    }
    return this.state.logs.map((log, i) => {
      return <Log key={i}>{log}</Log>;
    });
  };

  setupWebsocket = () => {
    let { currentCluster, currentProject } = this.context;
    let { selectedPod } = this.props;
    if (!selectedPod.metadata?.name) return;
    let protocol = process.env.NODE_ENV == "production" ? "wss" : "ws";
    this.ws = new WebSocket(
      `${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/k8s/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`
    );

    this.ws.onopen = () => {
      console.log("connected to websocket");
    };

    this.ws.onmessage = (evt: MessageEvent) => {
      this.setState({ logs: [...this.state.logs, evt.data] }, () => {
        if (this.state.scroll) {
          this.scrollToBottom(false);
        }
      });
    };

    this.ws.onerror = (err: ErrorEvent) => {
      console.log("websocket error:", err);
    };

    this.ws.onclose = () => {
      console.log("closing pod logs");
    };
  };

  refreshLogs = () => {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.setState({ logs: [] });
      this.setupWebsocket();
    }
  };

  componentDidMount() {
    this.setupWebsocket();
    this.scrollToBottom(false);
  }

  componentWillUnmount() {
    console.log("log unmount");
    if (this.ws) {
      this.ws.close();
    }
  }

  render() {
    return (
      <LogStream>
        <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
        <Options>
          <Scroll
            onClick={() => {
              this.setState({ scroll: !this.state.scroll }, () => {
                if (this.state.scroll) {
                  this.scrollToBottom(true);
                }
              });
            }}
          >
            <input
              type="checkbox"
              checked={this.state.scroll}
              onChange={() => {}}
            />
            Scroll to Bottom
          </Scroll>
          <Refresh
            onClick={() => {
              this.refreshLogs();
            }}
          >
            <i className="material-icons">autorenew</i>
            Refresh
          </Refresh>
        </Options>
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
`;

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
`;

const Options = styled.div`
  width: 100%;
  height: 25px;
  background: #397ae3;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
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
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  color: #ffffff44;
  font-size: 13px;
`;

const Log = styled.div`
  font-family: monospace;
`;
