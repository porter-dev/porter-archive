import React, { useEffect, useState } from "react";
import styled from "styled-components";

import app_event from "assets/app_event.png";
import build from "assets/build.png";
import deploy from "assets/deploy.png";
import pre_deploy from "assets/pre_deploy.png";
import loadingGif from "assets/loading.gif";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.png";
import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import api from "shared/api";
import { Log } from "main/home/cluster-dashboard/expanded-chart/logs-section/useAgentLogs";
import JSZip from "jszip";
import Anser, { AnserJsonEntry } from "anser";
import GHALogsModal from "../status/GHALogsModal";
import ChangeLogModal from "../ChangeLogModal";
import Chart from "main/home/cluster-dashboard/chart/Chart";
import { number } from "zod";
import { PorterAppEvent, PorterAppEventType } from "shared/types";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const EventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [logs, setLogs] = useState<Log[]>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getIcon = (eventType: string) => {
    switch (eventType) {
      case "APP_EVENT":
        return app_event;
      case "BUILD":
        return build;
      case "DEPLOY":
        return deploy;
      case "PRE_DEPLOY":
        return pre_deploy;
      default:
        return app_event;
    }
  };

  const getTitle = (eventType: string) => {
    switch (eventType) {
      case "APP_EVENT":
        return "Some application event";
      case "BUILD":
        return "Application build";
      case "DEPLOY":
        return "Application deploy";
      case "PRE_DEPLOY":
        return "Application pre-deploy";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return healthy;
      case "FAILED":
        return failure;
      case "PROGRESSING":
        return loadingGif;
      default:
        return loadingGif;
    }
  };

  const getDuration = (event: PorterAppEvent): string => {
    const startTimeStamp = new Date(event.created_at).getTime();
    const endTimeStamp = new Date(event.updated_at).getTime();

    const timeDifferenceMilliseconds = endTimeStamp - startTimeStamp;

    const seconds = Math.floor(timeDifferenceMilliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedTime = "";

    if (hours > 0) {
      formattedTime += `${hours} h `;
    }

    if (minutes > 0) {
      formattedTime += `${minutes} m `;
    }

    if (hours === 0 && minutes === 0) {
      formattedTime += `${remainingSeconds} s`;
    }

    return formattedTime.trim();
  };

  const renderStatusText = (event: PorterAppEvent) => {
    if (event.type === PorterAppEventType.BUILD) {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Build succeeded</Text>;
        case "FAILED":
          return <Text color="#FF6060">Build failed</Text>;
        default:
          return <Text color="#aaaabb66">Build in progress . . </Text>;
      }
    }

    if (event.type === PorterAppEventType.DEPLOY) {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Deployed v100</Text>;
        case "FAILED":
          return <Text color="#FF6060">Deploying v100 failed</Text>;
        default:
          return <Text color="#aaaabb66">Deploying v100 . . .</Text>;
      }
    }

    if (event.type === PorterAppEventType.PRE_DEPLOY) {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Pre-deploy succeeded . . </Text>;
        case "FAILED":
          return <Text color="#FF6060">Pre-deploy failed . . </Text>;
        default:
          return <Text color="#aaaabb66">Pre-deploy in progress . . </Text>;
      }
    }
  };
  const triggerWorkflow = async () => {
    try {
      const res = await api.reRunGHWorkflow(
        "",
        {},
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
          git_installation_id: appData.app.git_repo_id,
          owner: appData.app.repo_name?.split("/")[0],
          name: appData.app.repo_name?.split("/")[1],
          branch: appData.app.branch_name,
          filename: "porter_stack_" + appData.chart.name + ".yml",
        }
      );
      if (res.data != null) {
        window.open(res.data, "_blank", "noreferrer");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const renderInfoCta = (event: any) => {
    if (event.type === PorterAppEventType.APP_EVENT) {
      return (
        <>
          <Link
            hasunderline
            onClick={() => {
              setModalContent(
                <>
                  <Container row>
                    <Icon height="20px" src={app_event} />
                    <Spacer inline width="10px" />
                    <Text size={16}>Event details</Text>
                  </Container>
                  <Spacer y={1} />
                  <Text>TODO: display event logs</Text>
                </>
              );
              setShowModal(true);
            }}
          >
            View details
          </Link>
          <Spacer inline x={1} />
        </>
      );
    }

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

                    lines.forEach((line, index) => {
                      const anserLine: AnserJsonEntry[] = Anser.ansiToJson(
                        line
                      );
                      const log: Log = {
                        line: anserLine,
                        lineNumber: index + 1,
                        timestamp: line.match(
                          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/
                        )?.[0],
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
        console.log(appData);
        console.log(error);
      }
    };

    if (event.type === PorterAppEventType.BUILD) {
      switch (event.status) {
        case "SUCCESS":
          return (
            <>
              <Link hasunderline onClick={() => getBuildLogs()}>
                View logs
              </Link>

              {logModalVisible && (
                <GHALogsModal
                  appData={appData}
                  logs={logs}
                  modalVisible={logModalVisible}
                  setModalVisible={setLogModalVisible}
                  actionRunId={event.metadata?.action_run_id}
                />
              )}
              <Spacer inline x={1} />
            </>
          );
        case "FAILED":
          return (
            <>
              <Link hasunderline onClick={() => getBuildLogs()}>
                View logs
              </Link>

              {logModalVisible && (
                <GHALogsModal
                  appData={appData}
                  logs={logs}
                  modalVisible={logModalVisible}
                  setModalVisible={setLogModalVisible}
                  actionRunId={event.metadata?.action_run_id}
                />
              )}
              <Spacer inline x={1} />
            </>
          );
        default:
          return (
            <>
              <Link
                hasunderline
                target="_blank"
                to={`https://github.com/${appData.app.repo_name}/actions/runs/${event.metadata?.action_run_id}`}
              >
                View live logs
              </Link>
              <Spacer inline x={1} />
            </>
          );
      }
    }
    useEffect(() => {
      getBuildLogs();
    }, []);

    if (event.type === PorterAppEventType.DEPLOY) {
      if (event.status === "FAILED") {
        return (
          <>
            <Link
              hasunderline
              onClick={() => alert("TODO: open deploy logs modal")}
            >
              View logs
            </Link>
            <Spacer inline x={1} />
          </>
        );
      } else {
        return;
      }
    }

    if (event.type === PorterAppEventType.PRE_DEPLOY) {
      return (
        <>
          <Link hasunderline onClick={() => alert("TODO: open logs modal")}>
            View logs
          </Link>
          <Spacer inline x={1} />
        </>
      );
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={getIcon(event.type)} />
          <Spacer inline width="10px" />
          <Text size={14}>{getTitle(event.type)}</Text>
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={1} />
      <Container row spaced>
        <Container row>
          {event.type !== PorterAppEventType.APP_EVENT && (
            <>
              <Icon height="18px" src={getStatusIcon(event.status)} />
              <Spacer inline width="10px" />
            </>
          )}
          {renderStatusText(event)}
          {event.type !== PorterAppEventType.APP_EVENT && (
            <Spacer inline x={1} />
          )}
          {renderInfoCta(event)}
          {event.status === "FAILED" &&
            event.type !== PorterAppEventType.APP_EVENT && (
              <>
                <Link hasunderline onClick={() => triggerWorkflow()}>
                  <Container row>
                    <Icon height="10px" src={refresh} />
                    <Spacer inline width="5px" />
                    Retry
                  </Container>
                </Link>
              </>
            )}
          {event.status === "SUCCESS" && event.type == "DEPLOY" && (
            <>
              <Link
                hasunderline
                target="_blank"
                onClick={() => setDiffModalVisible(true)}
              >
                View Diff
              </Link>
              {diffModalVisible && (
                <ChangeLogModal
                  revision={event.metadata.revision}
                  currentChart={appData.chart}
                  modalVisible={diffModalVisible}
                  setModalVisible={setDiffModalVisible}
                />
              )}
            </>
          )}
        </Container>
        {false && <Text color="helper">user@email.com</Text>}
      </Container>
      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>{modalContent}</Modal>
      )}
    </StyledEventCard>
  );
};

export default EventCard;

const StyledEventCard = styled.div`
  width: 100%;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 85px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
  opacity: 0;
  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
  @keyframes slideIn {
    from {
      margin-left: -10px;
      opacity: 0;
      margin-right: 10px;
    }
    to {
      margin-left: 0;
      opacity: 1;
      margin-right: 0;
    }
  }
`;
