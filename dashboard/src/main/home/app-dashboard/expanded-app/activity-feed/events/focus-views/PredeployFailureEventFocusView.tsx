import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import React, { useEffect, useRef, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import Anser from "anser";
import dayjs from "dayjs";
import { Log as LogType, parseLogs } from "../../../useAgentLogs";
import { PorterAppEvent } from "shared/types";
import Text from "components/porter/Text";
import { readableDate } from "shared/string_utils";
import { getDuration } from "../utils";
import LogSection from "../../../LogSection";

type Props = {
    event: PorterAppEvent;
    appData: any;
};

const PreDeployFailureEventFocusView: React.FC<Props> = ({
    event,
    appData,
}) => {
    const [logs, setLogs] = useState<LogType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const scrollToBottomRef = useRef<HTMLDivElement | undefined>(undefined);
    const [noLogsMessage, setNoLogsMessage] = useState<string>("Waiting for logs...");

    useEffect(() => {
        if (!isLoading && scrollToBottomRef.current) {
            scrollToBottomRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [isLoading, logs, scrollToBottomRef]);

    // const getPredeployLogs = async () => {
    //     setIsLoading(true);
    //     try {
    //         if (appData.releaseChart == null) {
    //             setNoLogsMessage("Unable to retrieve logs because the pre-deploy job no longer exists.")
    //             return;
    //         }
    //         const logResp = await api.getLogsWithinTimeRange(
    //             "<token>",
    //             {
    //                 chart_name: appData.releaseChart.name,
    //                 namespace: appData.releaseChart.namespace,
    //                 start_range: dayjs(event.metadata.start_time).subtract(1, 'minute').toISOString(),
    //                 end_range: dayjs(event.metadata.end_time).add(1, 'minute').toISOString(),
    //                 limit: 1000,
    //             },
    //             {
    //                 project_id: appData.app.project_id,
    //                 cluster_id: appData.app.cluster_id,
    //             }
    //         )
    //         if (logResp.data == null || logResp.data.logs == null || logResp.data.logs.length == 0) {
    //             setNoLogsMessage("No logs found.")
    //             return;
    //         }
    //         setLogs(parseLogs(logResp.data.logs));
    //     } catch (error) {
    //         console.log(error);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // useEffect(() => {
    //     getPredeployLogs();
    // }, [event]);

    return (
        <>
            <Text size={16} color="#FF6060">Pre-deploy failed</Text>
            <Spacer y={0.5} />
            <Text color="helper">Started {readableDate(event.created_at)} and ran for {getDuration(event)}.</Text>
            <Spacer y={0.5} />
            <LogSection currentChart={appData.releaseChart} />
        </>
    );
};

export default PreDeployFailureEventFocusView;

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