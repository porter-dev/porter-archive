import React from "react";
import { GenericLogFilter, PorterLog } from "./types";
import styled from "styled-components";
import Anser from "anser";
import dayjs from "dayjs";
import { getPodSelectorFromPodNameAndAppName, getServiceNameFromPodNameAndAppName, getVersionTagColor } from "./utils";


type Props = {
    logs: PorterLog[];
    appName: string;
    filters: GenericLogFilter[];
};

const StyledLogs: React.FC<Props> = ({
    logs,
    appName,
    filters,
}) => {
    const renderFilterTagForLog = (filter: GenericLogFilter, log: PorterLog, index: number) => {
        if (log.metadata == null) {
            return null;
        }
        switch (filter.name) {
            case "revision":
                return (
                    <LogInnerPill
                        color={getVersionTagColor(log.metadata.revision)}
                        key={index}
                        onClick={() => filter.setValue(log.metadata.revision)}
                    >
                        {`Version: ${log.metadata.revision}`}
                    </LogInnerPill>
                )
            case "pod_name":
                return (
                    <LogInnerPill
                        color={"white"}
                        key={index}
                        onClick={() => filter.setValue(getPodSelectorFromPodNameAndAppName(log.metadata.pod_name, appName))}
                    >
                        {getServiceNameFromPodNameAndAppName(log.metadata.pod_name, appName)}
                    </LogInnerPill>
                )
            default:
                return null;
        }
    }

    return (
        <StyledLogsContainer>
            {logs.map((log, i) => {
                return (
                    <Log key={[log.lineNumber, i].join(".")}>
                        <LogLabelsContainer includeLabels={log.metadata != null}>
                            <LineNumber className="line-number">{log.lineNumber}.</LineNumber>
                            <LineTimestamp className="line-timestamp">
                                {log.timestamp
                                    ? dayjs(log.timestamp).format("MM/DD HH:mm:ss")
                                    : "-"}
                            </LineTimestamp>
                            {filters.map((filter, j) => {
                                return renderFilterTagForLog(filter, log, j)
                            })}
                        </LogLabelsContainer>
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
        </StyledLogsContainer>
    );
};

export default StyledLogs;

const StyledLogsContainer = styled.div`
`;

const LogLabelsContainer = styled.div<{ includeLabels: boolean }>`
    min-width: ${props => props.includeLabels ? "390px" : "100px"}; 
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    
`;

const LineTimestamp = styled.span`
    height: 100%;
    color: #949effff;
    opacity: 0.5;
    font-family: monospace;
    min-width: fit-content;
`

const LineNumber = styled.span`
    height: 100%;
    background: #202538;
    display: inline-block;
    text-align: right;
    min-width: 45px;
    opacity: 0.3;
    font-family: monospace;
`

const Log = styled.div`
  font-family: monospace;
  user-select: text;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 25px;
`;

const LogInnerPill = styled.div<{ color: string }>`
    display: inline-block;
    vertical-align: middle;
    width: 100px;
    padding: 0px 5px;
    height: 20px;
    color: black;
    background-color: ${(props) => props.color};
    border-radius: 5px;
    opacity: 1;
    font-family: monospace;
    cursor: pointer;
    hover: {
        border: 1px solid #949effff;
    }
    overflow: hidden;
    white-space: nowrap;    
    text-overflow: ellipsis;
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
