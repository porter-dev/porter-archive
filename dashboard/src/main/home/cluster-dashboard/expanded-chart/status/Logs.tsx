import React, {
  Component,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import * as Anser from "anser";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";

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
  getPreviousLogs: boolean;
};

class Logs extends Component<PropsType, StateType> {
  state = {
    logs: [] as [number, Anser.AnserJsonEntry[]][],
    numLogs: 0,
    ws: null as any,
    scroll: true,
    currentTab: "Application",
    getPreviousLogs: false,
  };

  ws = null as any;
  parentRef = React.createRef<HTMLDivElement>();

  getPodStatus = (status: any) => {
    if (
      status?.phase === "Pending" &&
      status?.containerStatuses !== undefined
    ) {
      return status.containerStatuses[0].state.waiting.reason;
    } else if (status?.phase === "Pending") {
      return "Pending";
    }

    if (status?.phase === "Failed") {
      return "failed";
    }

    if (status?.phase === "Running") {
      let collatedStatus = "running";

      status?.containerStatuses?.forEach((s: any) => {
        if (s.state?.waiting) {
          collatedStatus =
            s.state?.waiting.reason === "CrashLoopBackOff"
              ? "failed"
              : "waiting";
        } else if (s.state?.terminated) {
          collatedStatus = "failed";
        }
      });
      return collatedStatus;
    }
  };

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

    if (
      this.getPodStatus(selectedPod.status) === "failed" &&
      this.state.logs.length === 0
    ) {
      return (
        <Message>
          No logs to display from this pod.
          <Highlight
            onClick={() => {
              this.setState({ getPreviousLogs: true }, () => {
                this.refreshLogs();
              });
            }}
          >
            <i className="material-icons">autorenew</i>
            Get logs from crashed pod
          </Highlight>
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
          {log[1].map((ansi, j) => {
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
    const currentTab = this.state.currentTab;
    if (currentTab === "Application") {
      this.ws = new WebSocket(
        `${protocol}://${window.location.host}/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs`
      );
    } else {
      this.ws = new WebSocket(
        `${protocol}://${window.location.host}/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs?container_name=${currentTab}`
      );
    }

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
    if (
      this.ws &&
      typeof this.state.currentTab === "string" &&
      this.state.currentTab != "System"
    ) {
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

      if (this.state.currentTab == "System") {
        this.retrieveEvents(selectedPod);
        return;
      }

      this.setState({ getPreviousLogs: false });
      this.setupWebsocket();
      this.scrollToBottom(false);
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

    if (selectedPod?.spec?.containers?.length > 1) {
      const firstContainer = selectedPod?.spec?.containers[0];
      this.setState({ currentTab: firstContainer?.name }, () => {
        this.setupWebsocket();
        this.scrollToBottom(false);
      });
      return;
    }

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

  renderContainerTabs = () => {
    const containers = this.props.selectedPod?.spec?.containers;

    if (!Array.isArray(containers) || containers?.length <= 1) {
      return (
        <Tab
          onClick={() => {
            this.setState({ currentTab: "Application" });
          }}
          clicked={this.state.currentTab == "Application"}
        >
          Application
        </Tab>
      );
    }

    return (
      <>
        {containers.map((container: any) => {
          return (
            <Tab
              key={container.name}
              onClick={() => {
                this.setState({ currentTab: container.name });
              }}
              clicked={this.state.currentTab == container.name}
            >
              {container.name}
            </Tab>
          );
        })}
      </>
    );
  };

  render() {
    if (this.props.rawText) {
      return (
        <LogStreamAlt>
          <Wrapper ref={this.parentRef}>{this.renderLogs()}</Wrapper>
          <LogTabs>
            {this.renderContainerTabs()}
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
          {this.renderContainerTabs()}
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

type SelectedPodType = {
  spec: {
    [key: string]: any;
    containers: {
      [key: string]: any;
      name: string;
    }[];
  };
  metadata: {
    name: string;
    namespace: string;
  };
  status: {
    phase: string;
  };
};

const LogsFC: React.FC<{
  selectedPod: SelectedPodType;
  podError: string;
  rawText?: boolean;
}> = ({ selectedPod, podError, rawText }) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [containers, setContainers] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState("");
  const [logs, setLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const [prevLogs, setPrevLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const [showPreviousLogs, setShowPreviousLogs] = useState<boolean>(false);

  const [isScrollToBottomEnabled, setIsScrollToBottomEnabled] = useState(true);

  const wrapperRef = useRef<HTMLDivElement>();

  const { newWebsocket, openWebsocket, closeAllWebsockets } = useWebsockets();

  const scrollToBottom = (smooth: boolean) => {
    if (!wrapperRef.current) {
      return;
    }

    if (smooth) {
      wrapperRef.current.lastElementChild.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    } else {
      wrapperRef.current.lastElementChild.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
      });
    }
  };

  const getSystemLogs = async () => {
    const events = await api
      .getPodEvents(
        "<token>",
        {},
        {
          name: selectedPod?.metadata?.name,
          namespace: selectedPod?.metadata?.namespace,
          cluster_id: currentCluster?.id,
          id: currentProject?.id,
        }
      )
      .then((res) => res.data);

    let processedLogs = [] as Anser.AnserJsonEntry[][];

    events.items.forEach((evt: any) => {
      let ansiEvtType = evt.type == "Warning" ? "\u001b[31m" : "\u001b[32m";
      let ansiLog = Anser.ansiToJson(
        `${ansiEvtType}${evt.type}\u001b[0m \t \u001b[43m\u001b[34m\t${evt.reason} \u001b[0m \t ${evt.message}`
      );
      processedLogs.push(ansiLog);
    });

    // SET LOGS FOR SYSTEM
    setLogs((prevState) => ({
      ...prevState,
      system: processedLogs,
    }));
  };

  const getContainerPreviousLogs = async (containerName: string) => {
    try {
      const logs = await api
        .getPreviousLogsForContainer<{ previous_logs: string[] }>(
          "<token>",
          {
            container_name: containerName,
          },
          {
            pod_name: selectedPod?.metadata?.name,
            namespace: selectedPod?.metadata?.namespace,
            cluster_id: currentCluster?.id,
            project_id: currentProject?.id,
          }
        )
        .then((res) => res.data);
      // Process logs
      const processedLogs: Anser.AnserJsonEntry[][] = logs.previous_logs.map(
        (currentLog) => {
          let ansiLog = Anser.ansiToJson(currentLog);
          return ansiLog;
        }
      );

      setPrevLogs((pl) => ({
        ...pl,
        [containerName]: processedLogs,
      }));
    } catch (error) {}
  };

  const setupWebsocket = (containerName: string) => {
    if (!selectedPod?.metadata?.name) return;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${selectedPod?.metadata?.namespace}/pod/${selectedPod?.metadata?.name}/logs?container_name=${containerName}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket for container:", containerName);
      },
      onmessage: (evt: MessageEvent) => {
        let ansiLog = Anser.ansiToJson(evt.data);
        setLogs((logs) => {
          const tmpLogs = { ...logs };
          let containerLogs = tmpLogs[containerName] || [];

          containerLogs.push(ansiLog);
          // this is technically not as efficient as things could be
          // if there are performance issues, a deque can be used in place of a list
          // for storing logs
          if (containerLogs.length > MAX_LOGS) {
            containerLogs.shift();
          }

          return {
            ...logs,
            [containerName]: containerLogs,
          };
        });
      },
      onclose: () => {
        console.log("Websocket closed for container:", containerName);
      },
    };

    newWebsocket(`${containerName}-websocket`, endpoint, config);
    openWebsocket(`${containerName}-websocket`);
  };

  useEffect(() => {
    console.log("Selected pod updated");
    const currentContainers =
      selectedPod?.spec?.containers?.map((container) => container?.name) || [];

    setContainers(currentContainers);
    setCurrentTab(currentContainers[0]);
    return () => {
      closeAllWebsockets();
    };
  }, [selectedPod]);

  // Retrieve all previous logs for containers
  useEffect(() => {
    closeAllWebsockets();

    setPrevLogs({});
    setLogs({});

    if (!Array.isArray(containers)) {
      return;
    }

    getSystemLogs();
    containers.forEach((containerName) => {
      getContainerPreviousLogs(containerName);
      setupWebsocket(containerName);
    });
  }, [containers]);

  useEffect(() => {
    if (isScrollToBottomEnabled) {
      scrollToBottom(true);
    }
  }, [isScrollToBottomEnabled, logs]);

  const renderLogs = () => {
    if (podError && podError != "") {
      return <Message>{podError}</Message>;
    }

    if (!selectedPod?.metadata?.name) {
      return <Message>Please select a pod to view its logs.</Message>;
    }

    if (selectedPod?.status.phase === "Succeeded" && !rawText) {
      return (
        <Message>
          ⌛ This job has been completed. You can now delete this job.
        </Message>
      );
    }

    if (
      showPreviousLogs &&
      Array.isArray(prevLogs[currentTab]) &&
      prevLogs[currentTab].length
    ) {
      return prevLogs[currentTab]?.map((log, i) => {
        return (
          <Log key={i}>
            {log.map((ansi, j) => {
              if (ansi.clearLine) {
                return null;
              }

              return (
                <LogSpan key={i + "." + j} ansi={ansi}>
                  {ansi.content.replace(/ /g, "\u00a0")}
                </LogSpan>
              );
            })}
          </Log>
        );
      });
    }

    if (!Array.isArray(logs[currentTab]) || logs[currentTab]?.length === 0) {
      return (
        <Message>
          No logs to display from this pod.
          {/* <Highlight onClick={this.refreshLogs}>
            <i className="material-icons">autorenew</i>
            Refresh
          </Highlight> */}
        </Message>
      );
    }

    return logs[currentTab]?.map((log, i) => {
      return (
        <Log key={i}>
          {log.map((ansi, j) => {
            if (ansi.clearLine) {
              return null;
            }

            return (
              <LogSpan key={i + "." + j} ansi={ansi}>
                {ansi.content.replace(/ /g, "\u00a0")}
              </LogSpan>
            );
          })}
        </Log>
      );
    });
  };

  const renderContent = () => (
    <>
      <Wrapper ref={wrapperRef}>{renderLogs()}</Wrapper>
      <LogTabs>
        {containers.map((containerName, _i, arr) => {
          return (
            <Tab
              key={containerName}
              onClick={() => {
                setCurrentTab(containerName);
              }}
              clicked={currentTab === containerName}
            >
              {arr.length > 1 ? containerName : "Application"}
            </Tab>
          );
        })}
        <Tab
          onClick={() => {
            setCurrentTab("system");
          }}
          clicked={currentTab == "system"}
        >
          System
        </Tab>
      </LogTabs>
      <Options>
        <Scroll
          onClick={() => {
            setIsScrollToBottomEnabled(!isScrollToBottomEnabled);
            if (isScrollToBottomEnabled) {
              scrollToBottom(true);
            }
          }}
        >
          <input
            type="checkbox"
            checked={isScrollToBottomEnabled}
            onChange={() => {}}
          />
          Scroll to Bottom
        </Scroll>
        {Array.isArray(prevLogs[currentTab]) && prevLogs[currentTab].length && (
          <Scroll
            onClick={() => {
              setShowPreviousLogs(!showPreviousLogs);
            }}
          >
            <input
              type="checkbox"
              checked={showPreviousLogs}
              onChange={() => {}}
            />
            Show previous Logs
          </Scroll>
        )}
        <Refresh
          onClick={() => {
            // this.refreshLogs();
            console.log("Refresh logs");
          }}
        >
          <i className="material-icons">autorenew</i>
          Refresh
        </Refresh>
      </Options>
    </>
  );

  if (!containers?.length) {
    return null;
  }

  if (rawText) {
    return <LogStreamAlt>{renderContent()}</LogStreamAlt>;
  }

  return <LogStream>{renderContent()}</LogStream>;
};

export default LogsFC;

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
  width: max-content;
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
  font-size: 13px;
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
