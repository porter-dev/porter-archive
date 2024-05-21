import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import React, { useEffect, useRef, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import Anser, { type AnserJsonEntry } from "anser";
import JSZip from "jszip";
import dayjs from "dayjs";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import {getDuration, getStatusColor} from "../utils";
import Link from "components/porter/Link";
import { type PorterAppBuildEvent } from "../types";
import { type PorterLog } from "main/home/app-dashboard/expanded-app/logs/types";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

type Props = {
    event: PorterAppBuildEvent;
};

const BuildEventFocusView: React.FC<Props> = ({
    event,
}) => {
    const { porterApp, projectId, clusterId } = useLatestRevision();

    const [logs, setLogs] = useState<PorterLog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const scrollToBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLoading && scrollToBottomRef.current) {
            scrollToBottomRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [isLoading, logs, scrollToBottomRef]);

    const getBuildLogs = async () => {
        if (event == null || porterApp.git_repo_id == null || porterApp.repo_name == null || event.metadata.action_run_id == null) {
            return;
        }
        try {
            setLogs([]);

            const res = await api.getGHWorkflowLogById(
                "",
                {},
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                    git_installation_id: porterApp.git_repo_id,
                    owner: porterApp.repo_name.split("/")[0],
                    name: porterApp.repo_name.split("/")[1],
                    filename: "porter_stack_" + porterApp.name + ".yml",
                    run_id: event.metadata.action_run_id.toString(),
                }
            );
            const logs: PorterLog[] = [];
            if (res.data != null) {
                // Fetch the logs
                const logsResponse = await fetch(res.data);

                // Ensure that the response body is only read once
                const logsBlob = await logsResponse.blob();

                if (logsResponse.headers.get("Content-Type") === "application/zip") {
                    const zip = await JSZip.loadAsync(logsBlob);
                    const promises: any[] = [];

                    zip.forEach(function (relativePath, zipEntry) {
                        promises.push(
                            (async function () {
                                const fileData = await zip
                                    .file(relativePath)
                                    ?.async("string");

                                if (
                                    fileData &&
                                    fileData.includes("Run porter-dev/porter-cli-action@v0.1.0")
                                ) {
                                    const lines = fileData.split("\n");
                                    const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/;

                                    for (let i = 0; i < lines.length; i++) {
                                        const line = lines[i];
                                        if (line.includes("Post job cleanup.")) {
                                            break;
                                        }
                                        const lineWithoutTimestamp = line.replace(timestampPattern, "").trimStart();
                                        const anserLine: AnserJsonEntry[] = Anser.ansiToJson(lineWithoutTimestamp);
                                        if (lineWithoutTimestamp.toLowerCase().includes("error")) {
                                            anserLine[0].fg = "238,75,43";
                                        }

                                        const log: PorterLog = {
                                            line: anserLine,
                                            lineNumber: i + 1,
                                            timestamp: line.match(timestampPattern)?.[0],
                                        };

                                        logs.push(log);
                                    }
                                }
                            })()
                        );
                    });

                    await Promise.all(promises);
                    setLogs(logs);
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getBuildLogs();
    }, []);

    const renderHeaderText = () => {
        switch (event.status) {
            case "CANCELED":
                return <Text color={getStatusColor(event.status)} size={16}>Build canceled</Text>;
            case "FAILED":
                return <Text color={getStatusColor(event.status)} size={16}>Build failed</Text>;
        }
    };

    return (
        <>
            {renderHeaderText()}
            <Spacer y={0.5} />
            <Text color="helper">Started {readableDate(event.created_at)} and ran for {getDuration(event)}.</Text>
            <Spacer y={0.5} />
            <StyledLogsSection>
                {isLoading ? (
                    <Loading message="Waiting for logs..." />
                ) : logs.length == 0 ? (
                    <>
                        <Message>
                            No logs found.
                        </Message>
                    </>
                ) : (
                    <>
                        {logs?.map((log, i) => {
                            return (
                                <Log key={[log.lineNumber, i].join(".")}>
                                    <span className="line-number">{log.lineNumber}.</span>
                                    <span className="line-timestamp">
                                        {log.timestamp
                                            ? dayjs(log.timestamp).format("MMM D, YYYY HH:mm:ss")
                                            : "-"}
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
                                </Log>
                            );
                        })}
                    </>
                )}
                <div ref={scrollToBottomRef} />
            </StyledLogsSection>
            <Spacer y={0.5} />
            <Link
                hasunderline
                target="_blank"
                to={
                    event.metadata.action_run_id
                        ? `https://github.com/${porterApp.repo_name}/actions/runs/${event.metadata.action_run_id}`
                        : `https://github.com/${porterApp.repo_name}/actions`
                }
            >
                View full build logs
            </Link>
        </>
    );
};

export default BuildEventFocusView;

const StyledLogsSection = styled.div`
  width: 100%;
  min-height: 600px;
  height: calc(100vh - 460px);
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
