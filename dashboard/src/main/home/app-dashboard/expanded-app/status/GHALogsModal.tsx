import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Modal from "components/porter/Modal";
import TitleSection from "components/TitleSection";
import { Log } from "../useAgentLogs";
import Loading from "components/Loading";
import Text from "components/porter/Text";
import danger from "assets/danger.svg";
import Anser, { AnserJsonEntry } from "anser";

import dayjs from "dayjs";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Checkbox from "components/porter/Checkbox";
type Props = {
  appData: any;
  logs: Log[];
  modalVisible: boolean;
  setModalVisible: (x: boolean) => void;
  actionRunId?: string;
};

interface ExpandedIncidentLogsProps {
  logs: Log[];
}

const GHALogsModal: React.FC<Props> = ({
  appData,
  logs,
  modalVisible,
  setModalVisible,
  actionRunId,
}) => {
  const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
  const scrollToBottomRef = useRef<HTMLDivElement | undefined>(undefined);
  const ExpandedIncidentLogs = ({ logs }: ExpandedIncidentLogsProps) => {
    if (!logs.length) {
      return (
        <LogsLoadWrapper>
          <Loading />
        </LogsLoadWrapper>
      );
    }

    return (
      <LogsSectionWrapper>
        <StyledLogsSection>
          {logs?.map((log, i) => {
            return (
              <LogSpan key={[log.lineNumber, i].join(".")}>
                <span className="line-number">{log.lineNumber}.</span>
                <span className="line-timestamp">
                  {dayjs(log.timestamp).format("MMM D, YYYY HH:mm:ss")}
                </span>
                <LogOuter key={[log.lineNumber, i].join(".")}>
                  {log.line?.map((ansi, j) => {
                    if (ansi.clearLine) {
                      return null;
                    }

                    return (
                      <LogInnerSpan
                        key={[log.lineNumber, i, j].join(".")}
                        ansi={ansi}
                      >
                        {ansi.content.replace(/ /g, "\u00a0")}
                      </LogInnerSpan>
                    );
                  })}
                </LogOuter>
              </LogSpan>
            );
          })}
          <div ref={scrollToBottomRef} />
        </StyledLogsSection>
      </LogsSectionWrapper>
    );
  };
  useEffect(() => {
    if (scrollToBottomRef.current && scrollToBottomEnabled) {
      scrollToBottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [logs, scrollToBottomRef, scrollToBottomEnabled]);
  const renderExpandedEventMessage = () => {
    if (!logs) {
      return <Loading />;
    }
    return (
      <>
        <ExpandedIncidentLogs logs={logs} />
      </>
    );
  };

  return (
    <Modal closeModal={() => setModalVisible(false)} width={"800px"}>
      <TitleSection icon={danger}>
        <Text size={16}>Logs for {appData.app.name}</Text>
      </TitleSection>

      {renderExpandedEventMessage()}
      <Spacer y={0.5} />
      <Link
        hasunderline
        target="_blank"
        to={
          actionRunId
            ? `https://github.com/${appData.app.repo_name}/actions/runs/${actionRunId}`
            : `https://github.com/${appData.app.repo_name}/actions`
        }
      >
        View full build logs
      </Link>
    </Modal>
  );
};

export default GHALogsModal;

const LogsSectionWrapper = styled.div`
  position: relative;
`;

const StyledLogsSection = styled.div`
  margin-top: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  max-height: 400px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  border-top: none;
  background: #101420;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  overflow-y: auto;
  overflow-wrap: break-word;
  position: relative;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const LogSpan = styled.div`
  font-family: monospace;
  user-select: text;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  & > * {
    padding-block: 5px;
  }
  & > .line-timestamp {
    height: 100%;
    color: #949effff;
    opacity: 0.5;
    font-family: monospace;
    min-width: fit-content;
    padding-inline-end: 5px;
  }
  & > .line-number {
    height: 100%;
    background: #202538;
    display: inline-block;
    text-align: right;
    min-width: 45px;
    padding-inline-end: 5px;
    opacity: 0.3;
    font-family: monospace;
  }
`;

const LogOuter = styled.div`
  display: inline-block;
  word-wrap: anywhere;
  flex-grow: 1;
  font-family: monospace, sans-serif;
  font-size: 12px;
`;

const LogInnerSpan = styled.span`
  font-family: monospace, sans-serif;
  font-size: 12px;
  font-weight: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.decoration && props.ansi?.decoration == "bold" ? "700" : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`;

export const ViewLogsWrapper = styled.div`
  margin-bottom: -15px;
  margin-top: 15px;
`;
const LogsLoadWrapper = styled.div`
  height: 50px;
`;

const ScrollButton = styled.div`
  background: #26292e;
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  display: flex;
  cursor: pointer;
  align-items: center;
  padding: 10px;
  padding-left: 8px;
  > i {
    font-size: 16px;
    margin-right: 5px;
  }
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;
