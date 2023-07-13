import React from "react";
import { PorterLog } from "./types";
import styled from "styled-components";
import Anser from "anser";
import dayjs from "dayjs";


type Props = {
    logs: PorterLog[];
};

const StyledLogs: React.FC<Props> = ({
    logs
}) => {
    return (
        <>
            {logs.map((log, i) => {
                return (
                    <Log key={[log.lineNumber, i].join(".")}>
                        <span className="line-number">{log.lineNumber}.</span>
                        <span className="line-timestamp">
                            {log.timestamp
                                ? dayjs(log.timestamp).format("MM/DD/YYYY HH:mm:ss")
                                : "-"}
                        </span>
                        {log.metadata != null &&
                            <LogInnerPill>
                                {`Version: ${log.metadata.revision}`}
                            </LogInnerPill>
                        }
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
                    </Log>
                );
            })}
        </>
    );
};

export default StyledLogs;

const Log = styled.div`
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

const LogInnerPill = styled.div`
    display: flex;
    align-items: center;
    padding: 0px 5px;
    height: 90%;
    color: black;
    background-color: #949fffff;
    border-radius: 5px;
    opacity: 1;
    font-family: monospace;
    min-width: fit-content;
    padding-inline-end: 5px;

`

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
