import { useEffect, useRef, useState } from "react";
import { Log } from "../useAgentLogs";
import React from "react";
import styled from "styled-components";
import Loading from "components/Loading";
import dayjs from "dayjs";
import Anser from "anser";

interface ExpandedIncidentLogsProps {
    logs: Log[];
}

const ExpandedIncidentLogs: React.FC<ExpandedIncidentLogsProps> = ({ logs }: ExpandedIncidentLogsProps) => {
    const scrollToBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollToBottomRef.current) {
            scrollToBottomRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [logs, scrollToBottomRef]);

    return logs.length ?
        (<LogsSectionWrapper>
            <StyledLogsSection>
                {logs?.map((log, i) => {
                    return (
                        <LogSpan key={[log.lineNumber, i].join(".")}>
                            <span className="line-number">{log.lineNumber}.</span>
                            {log.timestamp && <span className="line-timestamp">
                                {dayjs(log.timestamp).format("MMM D, YYYY HH:mm:ss")}
                            </span>}
                            <LogOuter key={[log.lineNumber, i].join(".")}>
                                {Array.isArray(log.line) ? log.line?.map((ansi, j) => {
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
                                }) : (
                                    log.line
                                )}
                            </LogOuter>
                        </LogSpan>
                    );
                })}
                <div ref={scrollToBottomRef} />
            </StyledLogsSection>
        </LogsSectionWrapper>)
        :
        (<LogsLoadWrapper>
            <Loading />
        </LogsLoadWrapper >)
};

export default ExpandedIncidentLogs;


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
  align-items: flex-start;
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
