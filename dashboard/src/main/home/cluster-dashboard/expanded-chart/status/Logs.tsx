import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import * as Anser from 'anser';

type PropsType = {
  selectedPod: any;
  podError: string;
  rawText?: boolean;
};

type StateType = {
  logs: Anser.AnserJsonEntry[][];
  ws: any;
  scroll: boolean;
};

export default class Logs extends Component<PropsType, StateType> {
  state = {
    logs: [] as Anser.AnserJsonEntry[][],
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
    let { selectedPod, podError } = this.props;

    if (podError && podError != "") {
      return <Message>{this.props.podError}</Message>;
    }

    if (!selectedPod?.metadata?.name) {
      return <Message>Please select a pod to view its logs.</Message>;
    }

    if (selectedPod?.status.phase === "Succeeded" && !this.props.rawText) {
      return (
        <Message>
          ⌛ This job has been completed. You can now delete this job.
        </Message>
      );
    }

    if (this.state.logs.length == 0) {
      return <Message>No logs to display from this pod.</Message>;
    }

    return this.state.logs.map((log, i) => {
      return <Log key={i}>
        {this.state.logs[i].map((ansi, j) => {
          if (ansi.clearLine) {
            return null
          }

          return <LogSpan key={i + "." + j} ansi={ansi}>
            {ansi.content.replace(/ /g, '\u00a0')}
          </LogSpan>
        })}
      </Log>;
    });
  };

  setupWebsocket = () => {
    let { currentCluster, currentProject } = this.context;
    let { selectedPod } = this.props;
    if (!selectedPod?.metadata?.name) return;
    let protocol = process.env.NODE_ENV == "production" ? "wss" : "ws";
    this.ws = new WebSocket(
      `${protocol}://${process.env.API_SERVER}/api/projects/${currentProject.id}/k8s/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs?cluster_id=${currentCluster.id}&service_account_id=${currentCluster.service_account_id}`
    );

    this.ws.onopen = () => {};

    this.ws.onmessage = (evt: MessageEvent) => {
      let ansiLog = Anser.ansiToJson(evt.data)

      let logs = this.state.logs
      logs.push(ansiLog)

      this.setState({ logs: logs }, () => {
        if (this.state.scroll) {
          this.scrollToBottom(false);
        }
      });
    };

    this.ws.onerror = (err: ErrorEvent) => {};

    this.ws.onclose = () => {};
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
    if (this.props.rawText) {
      return (
        <LogStreamAlt>
          <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
        </LogStreamAlt>
      );
    }

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

const LogStreamAlt = styled(LogStream)`
  width: 100%;
  max-width: 100%;
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

const LogSpan = styled.span`
  font-family: 'Roboto Mono';
  font-size: 12px;
  font-weight: ${(props: { ansi: Anser.AnserJsonEntry }) => props.ansi?.decoration && props.ansi?.decoration == "bold" ? "700" : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) => props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) => props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`
