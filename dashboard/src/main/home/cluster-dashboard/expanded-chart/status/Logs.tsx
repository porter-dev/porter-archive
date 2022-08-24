import React, {
  Component,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import * as Anser from "anser";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import CommandLineIcon from "assets/command-line-icon";
import ConnectToLogsInstructionModal from "./ConnectToLogsInstructionModal";

const MAX_LOGS = 5000;
const LOGS_BUFFER_SIZE = 1000;

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
    labels: {
      [key: string]: string;
    };
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
  const [isScrollToBottomEnabled, setIsScrollToBottomEnabled] = useState(true);

  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const shouldScroll = useRef<boolean>(true);
  const wrapperRef = useRef<HTMLDivElement>();

  const scrollToBottom = (smooth: boolean) => {
    if (!wrapperRef.current || !shouldScroll.current) {
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

  const {
    logs,
    previousLogs,
    containers,
    currentContainer,
    setCurrentContainer,
    refresh,
  } = useLogs(selectedPod, scrollToBottom);

  const [showPreviousLogs, setShowPreviousLogs] = useState<boolean>(false);

  useEffect(() => {
    shouldScroll.current = isScrollToBottomEnabled;
  }, [isScrollToBottomEnabled]);

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
      Array.isArray(previousLogs) &&
      previousLogs.length
    ) {
      return previousLogs?.map((log, i) => {
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

    if (!Array.isArray(logs) || logs?.length === 0) {
      return (
        <Message>
          No logs to display from this pod.
          <Highlight onClick={refresh}>
            <i className="material-icons">autorenew</i>
            Refresh
          </Highlight>
        </Message>
      );
    }

    return logs?.map((log, i) => {
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
      {/* <ConnectToLogsInstructionModal
        show={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        chartName={selectedPod?.metadata?.labels["app.kubernetes.io/instance"]}
        namespace={selectedPod?.metadata?.namespace}
      />
      <CLIModalIconWrapper
        onClick={(e) => {
          e.preventDefault();
          setShowConnectionModal(true);
        }}
      >
        <CLIModalIcon />
        CLI Logs Instructions
      </CLIModalIconWrapper> */}
      <Wrapper ref={wrapperRef}>{renderLogs()}</Wrapper>
      <LogTabs>
        {containers.map((containerName, _i, arr) => {
          return (
            <Tab
              key={containerName}
              onClick={() => {
                setCurrentContainer(containerName);
              }}
              clicked={currentContainer === containerName}
            >
              {arr.length > 1 ? containerName : "Application"}
            </Tab>
          );
        })}
        <Tab
          onClick={() => {
            setCurrentContainer("system");
          }}
          clicked={currentContainer == "system"}
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
        {Array.isArray(previousLogs) && previousLogs.length > 0 && (
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
            // console.log("Refresh logs");
            refresh();
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

const useLogs = (
  currentPod: SelectedPodType,
  scroll?: (smooth: boolean) => void
) => {
  let logsBuffer: Anser.AnserJsonEntry[][] = [];
  const currentPodName = useRef<string>();

  const { currentCluster, currentProject } = useContext(Context);
  const [containers, setContainers] = useState<string[]>([]);
  const [currentContainer, setCurrentContainer] = useState<string>("");
  const [logs, setLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const [prevLogs, setPrevLogs] = useState<{
    [key: string]: Anser.AnserJsonEntry[][];
  }>({});

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    getWebsocket,
    closeWebsocket,
  } = useWebsockets();

  const getSystemLogs = async () => {
    const events = await api
      .getPodEvents(
        "<token>",
        {},
        {
          name: currentPod?.metadata?.name,
          namespace: currentPod?.metadata?.namespace,
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
            pod_name: currentPod?.metadata?.name,
            namespace: currentPod?.metadata?.namespace,
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

  /**
   * Updates the `logs` for `containerName` with `newLogs`
   * @param containerName Name of the container
   * @param newLogs New logs to update for
   */
  const updateContainerLogs = (
    containerName: string,
    newLogs: Anser.AnserJsonEntry[][]
  ) => {
    setLogs((logs) => {
      const tmpLogs = { ...logs };
      let containerLogs = tmpLogs[containerName] || [];

      containerLogs.push(...newLogs);
      // this is technically not as efficient as things could be
      // if there are performance issues, a deque can be used in place of a list
      // for storing logs
      if (containerLogs.length > MAX_LOGS) {
        containerLogs.shift();
      }

      if (typeof scroll === "function") {
        scroll(true);
      }
      return {
        ...logs,
        [containerName]: containerLogs,
      };
    });
  };

  /**
   * Flushes the logs buffer. If `containerName` is provided,
   * it will update logs for the `containerName` before executing
   * the flush operation
   * @param containerName Name of the container
   */
  const flushLogsBuffer = (containerName?: string) => {
    if (containerName) {
      updateContainerLogs(containerName, logsBuffer);
    }

    logsBuffer = [];
  };

  const setupWebsocket = (containerName: string, websocketKey: string) => {
    if (!currentPod?.metadata?.name) return;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${currentPod?.metadata?.namespace}/pod/${currentPod?.metadata?.name}/logs?container_name=${containerName}`;

    const config: NewWebsocketOptions = {
      onopen: () => {
        console.log("Opened websocket:", websocketKey);
      },
      onmessage: (evt: MessageEvent) => {
        let ansiLog = Anser.ansiToJson(evt.data);
        logsBuffer.push(ansiLog);

        // If size of the logs buffer is exceeded, immediately flush the buffer
        if (logsBuffer.length > LOGS_BUFFER_SIZE) {
          flushLogsBuffer(containerName);
        }
      },
      onclose: () => {
        console.log("Closed websocket:", websocketKey);
      },
    };

    newWebsocket(websocketKey, endpoint, config);
    openWebsocket(websocketKey);
  };

  const refresh = () => {
    const websocketKey = `${currentPodName.current}-${currentContainer}-websocket`;
    closeWebsocket(websocketKey);

    // Flush and re-initialize empty buffer
    flushLogsBuffer();
    setPrevLogs((prev) => ({ ...prev, [currentContainer]: [] }));
    setLogs((prev) => ({ ...prev, [currentContainer]: [] }));

    if (!Array.isArray(containers)) {
      return;
    }

    if (currentContainer === "system") {
      getSystemLogs();
    } else {
      getContainerPreviousLogs(currentContainer);
      setupWebsocket(currentContainer, websocketKey);
    }
  };

  useEffect(() => {
    // console.log("Selected pod updated");
    if (currentPod?.metadata?.name === currentPodName.current) {
      return () => {};
    }
    currentPodName.current = currentPod?.metadata?.name;
    const currentContainers =
      currentPod?.spec?.containers?.map((container) => container?.name) || [];

    setContainers(currentContainers);
    setCurrentContainer(currentContainers[0]);
  }, [currentPod]);

  // Retrieve all previous logs for containers
  useEffect(() => {
    if (!Array.isArray(containers)) {
      return;
    }

    closeAllWebsockets();

    flushLogsBuffer();
    setPrevLogs({});
    setLogs({});

    getSystemLogs();
    containers.forEach((containerName) => {
      const websocketKey = `${currentPodName.current}-${containerName}-websocket`;

      getContainerPreviousLogs(containerName);

      if (!getWebsocket(websocketKey)) {
        setupWebsocket(containerName, websocketKey);
      }
    });

    return () => {
      closeAllWebsockets();
    };
  }, [containers]);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  /**
   * In some situations, we might never hit the limit for the max buffer size.
   * An example is if the total logs for the pod < LOGS_BUFFER_SIZE.
   *
   * For handling situations like this, we would want to force a flush operation
   * on the buffer so that we dont have any stale logs
   */
  useEffect(() => {
    const flushLogsBufferInterval = setInterval(
      () => flushLogsBuffer(currentContainer),
      3000
    );

    return () => clearInterval(flushLogsBufferInterval);
  }, [currentContainer]);

  const currentLogs = useMemo(() => {
    return logs[currentContainer] || [];
  }, [currentContainer, logs]);

  const currentPreviousLogs = useMemo(() => {
    return prevLogs[currentContainer] || [];
  }, [currentContainer, prevLogs]);

  return {
    containers,
    currentContainer,
    setCurrentContainer: (newContainer: string) => {
      // First flush the logs of the older container
      flushLogsBuffer(currentContainer);
      setCurrentContainer(newContainer);
    },
    logs: currentLogs,
    previousLogs: currentPreviousLogs,
    refresh,
  };
};

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

const CLIModalIconWrapper = styled.div`
  max-width: 200px;
  height: 35px;
  margin: 10px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px 6px 10px;
  text-align: left;
  border: 1px solid #ffffff55;
  border-radius: 8px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;
  :hover {
    cursor: pointer;
    background: #ffffff22;
    > path {
      fill: #ffffff77;
    }
  }

  > path {
    fill: #ffffff99;
  }
`;

const CLIModalIcon = styled(CommandLineIcon)`
  width: 32px;
  height: 32px;
  padding: 8px;

  > path {
    fill: #ffffff99;
  }
`;
