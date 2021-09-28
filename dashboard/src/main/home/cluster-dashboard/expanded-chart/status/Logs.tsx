import React, { Component } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import * as Anser from "anser";
import api from "shared/api";

const MAX_LOGS = 1000;

type PropsType = {
  selectedPod: any;
  podError: string;
  rawText?: boolean;
};

type StateType = {
  logs: [number, Anser.AnserJsonEntry[]][];
  numLogs: number;
  ws: any;
  scroll: boolean;
  currentTab: string;
};

export default class Logs extends Component<PropsType, StateType> {
  private numLogs: React.RefObject<number>;

  state = {
    logs: [] as [number, Anser.AnserJsonEntry[]][],
    numLogs: 0,
    ws: null as any,
    scroll: true,
    currentTab: "Application",
  };

  ws = null as any;
  parentRef = React.createRef<HTMLDivElement>();

  scrollToBottom = (smooth: boolean) => {
    if (smooth) {
      this.parentRef.current.lastElementChild.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    } else {
      this.parentRef.current.lastElementChild.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
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
      return (
        <Message>
          No logs to display from this pod.
          <Highlight onClick={this.refreshLogs}>
            <i className="material-icons">autorenew</i>
            Refresh
          </Highlight>
        </Message>
      );
    }

    return this.state.logs.map((log, i) => {
      const key = log[0];
      return (
        <Log key={key}>
          {this.state.logs[i][1].map((ansi, j) => {
            if (ansi.clearLine) {
              return null;
            }

            return (
              <LogSpan key={key + "." + j} ansi={ansi}>
                {ansi.content.replace(/ /g, "\u00a0")}
              </LogSpan>
            );
          })}
        </Log>
      );
    });
  };

  setupWebsocket = () => {
    let { currentCluster, currentProject } = this.context;
    let { selectedPod } = this.props;
    if (!selectedPod?.metadata?.name) return;
    let protocol = window.location.protocol == "https:" ? "wss" : "ws";

    this.ws = new WebSocket(
      `${protocol}://${window.location.host}/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs`
    );

    this.ws.onopen = () => {};

    this.ws.onmessage = (evt: MessageEvent) => {
      let ansiLog = Anser.ansiToJson(evt.data);

      let logs = this.state.logs;
      logs.push([this.state.numLogs, ansiLog]);

      // this is technically not as efficient as things could be
      // if there are performance issues, a deque can be used in place of a list
      // for storing logs
      if (logs.length > MAX_LOGS) {
        logs.shift();
      }

      this.setState(
        (prev) => {
          return {
            logs: prev.logs,
            numLogs: prev.numLogs + 1,
          };
        },
        () => {
          if (this.state.scroll) {
            this.scrollToBottom(false);
          }
        }
      );
    };

    this.ws.onerror = (err: ErrorEvent) => {};

    this.ws.onclose = () => {};
  };

  refreshLogs = () => {
    let { selectedPod } = this.props;
    if (this.ws && this.state.currentTab == "Application") {
      this.ws.close();
      this.ws = null;
      this.setState({ logs: [] });
      this.setupWebsocket();
    } else if (this.state.currentTab == "System") {
      this.retrieveEvents(selectedPod);
    }
  };

  componentDidUpdate = (prevProps: any, prevState: any) => {
    if (prevState.currentTab !== this.state.currentTab) {
      let { selectedPod } = this.props;

      this.ws?.close();

      this.setState({ logs: [] });

      if (this.state.currentTab == "Application") {
        this.setupWebsocket();
        this.scrollToBottom(false);
        return;
      }

      this.retrieveEvents(selectedPod);
    }
  };

  retrieveEvents = (selectedPod: any) => {
    api
      .getPodEvents(
        "<token>",
        {},
        {
          name: selectedPod?.metadata?.name,
          namespace: selectedPod?.metadata?.namespace,
          cluster_id: this.context.currentCluster.id,
          id: this.context.currentProject.id,
        }
      )
      .then((res) => {
        let logs = [] as [number, Anser.AnserJsonEntry[]][];
        // TODO: column view
        // logs.push(Anser.ansiToJson("\u001b[33;5;196mEvent Type\u001b[0m \t || \t \u001b[43m\u001b[34m\tReason\t\u001b[0m \t ||\tMessage"))

        res.data.items.forEach((evt: any) => {
          let ansiEvtType = evt.type == "Warning" ? "\u001b[31m" : "\u001b[32m";
          let ansiLog = Anser.ansiToJson(
            `${ansiEvtType}${evt.type}\u001b[0m \t \u001b[43m\u001b[34m\t${evt.reason} \u001b[0m \t ${evt.message}`
          );
          logs.push([logs.length, ansiLog]);
        });
        this.setState({ logs: logs });
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  componentDidMount() {
    let { selectedPod } = this.props;

    if (this.state.currentTab == "Application") {
      this.setupWebsocket();
      this.scrollToBottom(false);
      return;
    }

    this.retrieveEvents(selectedPod);
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }

  render() {
    if (this.props.rawText) {
      return (
        <LogStreamAlt>
          <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
          <LogTabs>
            <Tab
              onClick={() => {
                this.setState({ currentTab: "Application" });
              }}
              clicked={this.state.currentTab == "Application"}
            >
              Application
            </Tab>
            <Tab
              onClick={() => {
                this.setState({ currentTab: "System" });
              }}
              clicked={this.state.currentTab == "System"}
            >
              System
            </Tab>
          </LogTabs>
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
        </LogStreamAlt>
      );
    }

    return (
      <LogStream>
        <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
        <LogTabs>
          <Tab
            onClick={() => {
              this.setState({ currentTab: "Application" });
            }}
            clicked={this.state.currentTab == "Application"}
          >
            Application
          </Tab>
          <Tab
            onClick={() => {
              this.setState({ currentTab: "System" });
            }}
            clicked={this.state.currentTab == "System"}
          >
            System
          </Tab>
        </LogTabs>
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

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: #8590ff;
  cursor: pointer;

  > i {
    font-size: 16px;
    margin-right: 3px;
  }
`;

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
    width: 18px;
    margin-left: 10px;
    margin-right: 6px;
    pointer-events: none;
  }
`;

const Tab = styled.div`
  background: ${(props: { clicked: boolean }) =>
    props.clicked ? "#503559" : "#7c548a"};
  padding: 0px 10px;
  margin: 0px 7px 0px 0px;
  align-items: center;
  display: flex;
  cursor: pointer;
  height: 100%;
  border-radius: 8px 8px 0px 0px;

  :hover {
    background: #503559;
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

const LogTabs = styled.div`
  width: 100%;
  height: 25px;
  background: #121318;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
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
  background: #121318;
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
  font-family: monospace, sans-serif;
  font-size: 12px;
  font-weight: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.decoration && props.ansi?.decoration == "bold" ? "700" : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`;
