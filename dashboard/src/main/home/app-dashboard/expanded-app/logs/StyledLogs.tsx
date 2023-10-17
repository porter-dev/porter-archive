import React from "react";
import { GenericFilter, PorterLog } from "./types";
import styled from "styled-components";
import Anser from "anser";
import dayjs from "dayjs";
import { getPodSelectorFromServiceName, getServiceNameFromPodNameAndAppName, getVersionTagColor } from "./utils";
import { Service } from "../../new-app-flow/serviceTypes";


type Props = {
    logs: PorterLog[];
    appName: string;
    filters: GenericFilter[];
    services?: Service[];
};

const StyledLogs: React.FC<Props> = ({
    logs,
    appName,
    filters,
    services,
}) => {
    const renderFilterTagForLog = (filter: GenericFilter, log: PorterLog, index: number) => {
        if (log.metadata == null) {
            return null;
        }
        switch (filter.name) {
            case "revision":
                if (log.metadata.revision == null || log.metadata.revision === "") {
                    return null;
                }
                return (
                    <StyledLogsTableData width={"100px"} key={index}>
                        <LogInnerPill
                            color={getVersionTagColor(log.metadata.revision)}
                            key={index}
                            onClick={() => filter.setValue(log.metadata.revision)}
                        >
                            {`Version: ${log.metadata.revision}`}
                        </LogInnerPill>
                    </StyledLogsTableData>
                )
            case "pod_name":
                if (log.metadata.pod_name == null || log.metadata.pod_name === "") {
                    return null;
                }
                return (
                    <StyledLogsTableData width={"100px"} key={index}>
                        <LogInnerPill
                            color={"white"}
                            key={index}
                            onClick={() => filter.setValue(getPodSelectorFromServiceName(getServiceNameFromPodNameAndAppName(log.metadata.pod_name, appName), services) ?? GenericFilter.getDefaultOption("pod_name").value)}
                        >
                            {getServiceNameFromPodNameAndAppName(log.metadata.pod_name, appName)}
                        </LogInnerPill>
                    </StyledLogsTableData>
                )
            case "service_name":
                if (log.metadata?.raw_labels?.porter_run_service_name == null || log.metadata?.raw_labels?.porter_run_service_name === "") {
                    return null;
                }
                return (
                    <StyledLogsTableData width={"100px"} key={index}>
                        <LogInnerPill
                            color={"white"}
                            key={index}
                            onClick={() => filter.setValue(log.metadata?.raw_labels?.porter_run_service_name ?? GenericFilter.getDefaultOption("service_name").value)}
                        >
                            {log.metadata.raw_labels?.porter_run_service_name}
                        </LogInnerPill>
                    </StyledLogsTableData>
                )
            default:
                return null;
        }
    }

    return (
        <StyledLogsTable>
            <StyledLogsTableBody>
                {logs.map((log, i) => {
                    return (
                        <StyledLogsTableRow key={[log.lineNumber, i].join(".")}>
                            <StyledLogsTableData width={"100px"}>
                                <LineTimestamp className="line-timestamp">
                                    {log.timestamp
                                        ? dayjs(log.timestamp).format("MM/DD HH:mm:ss")
                                        : "-"}
                                </LineTimestamp>
                            </StyledLogsTableData>
                            {filters.map((filter, j) => {
                                return renderFilterTagForLog(filter, log, j)
                            })}
                            <StyledLogsTableData>
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
                            </StyledLogsTableData>
                        </StyledLogsTableRow>
                    )
                })}
            </StyledLogsTableBody>
        </StyledLogsTable>
    );
};

export default StyledLogs;

const StyledLogsTable = styled.table`
    border-collapse: collapse;
`;

const StyledLogsTableBody = styled.tbody`
`;

const StyledLogsTableRow = styled.tr`
    
`;

const StyledLogsTableData = styled.td<{ width?: string }>`
    padding: 2px;
    vertical-align: top;
    ${(props) => props.width && `width: ${props.width};`}
`;

const LineTimestamp = styled.div`
    height: 100%;
    color: #949effff;
    opacity: 0.5;
    font-family: monospace;
    white-space: nowrap;
`

const LogInnerPill = styled.div<{ color: string }>`
    display: inline-block;
    vertical-align: middle;
    width: 120px;
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
  user-select: text;
  display: inline-block;
  word-wrap: anywhere;
  flex-grow: 1;
  font-family: monospace, sans-serif;
  font-size: 12px;
`;

const LogInnerSpan = styled.span`
  user-select: text;
  font-family: monospace, sans-serif;
  font-size: 12px;
  font-weight: ${(props: { ansi: Anser.AnserJsonEntry }) =>
        props.ansi?.decoration && props.ansi?.decoration == "bold" ? "700" : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
        props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
        props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`;
