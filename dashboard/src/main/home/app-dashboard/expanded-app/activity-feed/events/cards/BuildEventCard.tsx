import React, { useState } from "react";
import styled from "styled-components";

import build from "assets/build.png";

import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";
import api from "shared/api";
import { Log } from "main/home/cluster-dashboard/expanded-chart/logs-section/useAgentLogs";
import JSZip from "jszip";
import Anser, { AnserJsonEntry } from "anser";
import GHALogsModal from "../../../status/GHALogsModal";
import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon, triggerWorkflow } from '../utils';
import { StyledEventCard } from "./EventCard";
import document from "assets/document.svg";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const BuildEventCard: React.FC<Props> = ({ event, appData }) => {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return <Text color="#68BF8B">Build succeeded</Text>;
      case "FAILED":
        return <Text color="#FF6060">Build failed</Text>;
      default:
        return <Text color="#aaaabb66">Build in progress...</Text>;
    }
  };

  const getBuildLogs = async () => {
    try {
      setLogs([]);
      setLogModalVisible(true);

      const res = await api.getGHWorkflowLogById(
        "",
        {},
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
          git_installation_id: appData.app.git_repo_id,
          owner: appData.app.repo_name?.split("/")[0],
          name: appData.app.repo_name?.split("/")[1],
          filename: "porter_stack_" + appData.chart.name + ".yml",
          run_id: event.metadata.action_run_id,
        }
      );
      let logs: Log[] = [];
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

                  lines.forEach((line, index) => {
                    const lineWithoutTimestamp = line.replace(timestampPattern, "").trimStart();
                    const anserLine: AnserJsonEntry[] = Anser.ansiToJson(lineWithoutTimestamp);
                    if (lineWithoutTimestamp.toLowerCase().includes("error")) {
                      anserLine[0].fg = "238,75,43";
                    }

                    const log: Log = {
                      line: anserLine,
                      lineNumber: index + 1,
                      timestamp: line.match(timestampPattern)?.[0],
                    };

                    logs.push(log);
                  });
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
    }
  };

  const renderInfoCta = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return null;
      case "FAILED":
        return (
          <Wrapper>
            <Link to={`/apps/${appData.app.name}/events/${event.id}`} hasunderline>
              <Container row>
                <Icon src={document} height="10px" />
                <Spacer inline width="5px" />
                View details
              </Container>
            </Link>
            <Spacer inline x={1} />
            <Link hasunderline onClick={() => triggerWorkflow(appData)}>
              <Container row>
                <Icon height="10px" src={refresh} />
                <Spacer inline width="5px" />
                Retry
              </Container>
            </Link>
          </Wrapper>
        );
      default:
        return (
          <Wrapper>
            <Link
              hasunderline
              target="_blank"
              to={`https://github.com/${appData.app.repo_name}/actions/runs/${event.metadata?.action_run_id}`}
            >
              View live logs
            </Link>
            <Spacer inline x={1} />
          </Wrapper>
        );
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={build} />
          <Spacer inline width="10px" />
          <Text>Application build</Text>
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText(event)}
          <Spacer inline x={1} />
          {renderInfoCta(event)}
          <Spacer inline x={1} />
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default BuildEventCard;

const Wrapper = styled.div`
  margin-top: -3px;
`;
