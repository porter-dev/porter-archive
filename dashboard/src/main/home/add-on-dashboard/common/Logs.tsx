import React from "react";
import type Anser from "anser";
import dayjs from "dayjs";
import styled from "styled-components";

import { useAddonLogs } from "lib/hooks/useAddon";

import { useAddonContext } from "../AddonContextProvider";

const Logs: React.FC = () => {
  const { projectId, deploymentTarget, addon } = useAddonContext();
  const { logs } = useAddonLogs({
    projectId,
    deploymentTarget,
    addon,
  });

  return (
    <StyledLogsSection>
      <StyledLogsTable>
        <StyledLogsTableBody>
          {logs.map((log, i) => {
            return (
              <StyledLogsTableRow key={[log.lineNumber, i].join(".")}>
                <StyledLogsTableData width={"120px"}>
                  <LineTimestamp className="line-timestamp">
                    {log.timestamp
                      ? dayjs(log.timestamp).format("MM/DD HH:mm:ss")
                      : "-"}
                  </LineTimestamp>
                </StyledLogsTableData>
                <StyledLogsTableData width={"100px"}>
                  <LogInnerPill color={"#7B61FF"}>
                    {log.controllerName}
                  </LogInnerPill>
                </StyledLogsTableData>
                <StyledLogsTableData width={"100px"}>
                  <LogInnerPill color={"#FF7B61"}>{log.podName}</LogInnerPill>
                </StyledLogsTableData>
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
    </StyledLogsSection>
  );
};

export default Logs;

const StyledLogsTable = styled.table`
  border-collapse: collapse;
`;

const StyledLogsTableBody = styled.tbody``;

const StyledLogsTableRow = styled.tr``;

const StyledLogsTableData = styled.td<{ width?: string }>`
  padding: 2px;
  vertical-align: top;
  ${(props) => props.width && `max-width: ${props.width};`}
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
  width: 100%;
  padding: 0px 5px;
  height: 20px;
  color: black;
  background-color: ${(props) => props.color};
  border-radius: 5px;
  opacity: 1;
  font-family: monospace;
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

const StyledLogsSection = styled.div`
  width: 100%;
  height: 600px;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  background: #000000;
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
