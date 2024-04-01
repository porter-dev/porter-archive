import React from "react";
import type Anser from "anser";
import dayjs from "dayjs";
import styled from "styled-components";
import { match } from "ts-pattern";

import { GenericFilter } from "../../expanded-app/logs/types";
import { type PorterLog } from "./utils";

export const getVersionTagColor = (version: string): string => {
  const colors = ["#7B61FF", "#FF7B61", "#61FF7B"];

  const versionInt = parseInt(version);
  if (isNaN(versionInt)) {
    return colors[0];
  }
  return colors[versionInt % colors.length];
};

type Props = {
  logs: PorterLog[];
  appName: string;
  filters: GenericFilter[];
};

const StyledLogs: React.FC<Props> = ({ logs, filters }) => {
  const renderFilterTagForLog = (
    filter: GenericFilter,
    log: PorterLog,
    index: number
  ): React.ReactNode => {
    return match(filter.name)
      .with("revision", () => {
        return (
          <StyledLogsTableData width={"100px"} key={index}>
            <LogInnerPill
              color={getVersionTagColor(log.revision)}
              key={index}
              onClick={() => {
                filter.setValue(log.revision);
              }}
            >
              {`Version: ${log.revision}`}
            </LogInnerPill>
          </StyledLogsTableData>
        );
      })
      .with("pod_name", () => {
        return (
          <StyledLogsTableData width={"100px"} key={index}>
            <LogInnerPill
              color={"white"}
              key={index}
              onClick={() => {
                filter.setValue(log.service_name);
              }}
            >
              {log.service_name}
            </LogInnerPill>
          </StyledLogsTableData>
        );
      })
      .with("service_name", () => {
        return (
          <StyledLogsTableData width={"100px"} key={index}>
            <LogInnerPill
              color={"white"}
              key={index}
              onClick={() => {
                filter.setValue(
                  log.service_name ??
                    GenericFilter.getDefaultOption("service_name").value
                );
              }}
            >
              {log.service_name}
            </LogInnerPill>
          </StyledLogsTableData>
        );
      })
      .otherwise(() => null);
  };

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
                return renderFilterTagForLog(filter, log, j);
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
          );
        })}
      </StyledLogsTableBody>
    </StyledLogsTable>
  );
};

export default StyledLogs;

const StyledLogsTable = styled.table`
  border-collapse: collapse;
`;

const StyledLogsTableBody = styled.tbody``;

const StyledLogsTableRow = styled.tr``;

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
`;

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
`;

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
    props.ansi?.decoration && props.ansi?.decoration === "bold"
      ? "700"
      : "400"};
  color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.fg ? `rgb(${props.ansi?.fg})` : "white"};
  background-color: ${(props: { ansi: Anser.AnserJsonEntry }) =>
    props.ansi?.bg ? `rgb(${props.ansi?.bg})` : "transparent"};
`;
