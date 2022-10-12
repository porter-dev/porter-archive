import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Anser from "anser";
import CommandLineIcon from "assets/command-line-icon";
import ConnectToLogsInstructionModal from "./ConnectToLogsInstructionModal";
import { SelectedPodType } from "./types";
import { useLogs } from "./useLogs";

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
        <Refresh onClick={() => refresh()}>
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
