import React, { useMemo, useState } from "react";
import dayjs from "dayjs";

import Button from "components/porter/Button";
import CollapsibleContainer from "components/porter/CollapsibleContainer";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import Logs from "main/home/app-dashboard/validate-apply/logs/Logs";
import { useIntercom } from "lib/hooks/useIntercom";
import { type ClientService } from "lib/porter-apps/services";

import { feedDate } from "shared/string_utils";
import chat from "assets/chat.svg";
import document from "assets/document.svg";
import time from "assets/time.svg";

import { type PorterAppServiceNotification } from "../../../activity-feed/events/types";
import { Message, NotificationWrapper } from "../NotificationExpandedView";

type Props = {
  message: PorterAppServiceNotification;
  isFirst: boolean;
  service: ClientService;
  projectId: number;
  clusterId: number;
  appName: string;
  deploymentTargetId: string;
  appId: number;
  appRevisionId: string;
  showLiveLogs: boolean;
};

const ServiceMessage: React.FC<Props> = ({
  isFirst,
  message,
  service,
  projectId,
  clusterId,
  appName,
  deploymentTargetId,
  appId,
  appRevisionId,
  showLiveLogs,
}) => {
  const { showIntercomWithMessage } = useIntercom();
  const { linkToTabGenerator } = useLatestRevision();

  const [logsVisible, setLogsVisible] = useState<boolean>(isFirst);
  const serviceNames = useMemo(() => {
    if (service.config.type === "predeploy") {
      return ["predeploy"];
    }
    return [service.name.value];
  }, [JSON.stringify(service)]);

  return (
    <NotificationWrapper>
      <Message>
        <Container row spaced>
          <Container row>
            <img
              src={document}
              style={{ width: "15px", marginRight: "10px" }}
            />
            {message.error.summary}
          </Container>
          <Container row>
            <img src={time} style={{ width: "15px", marginRight: "10px" }} />
            <Text>{feedDate(message.timestamp)}</Text>
          </Container>
        </Container>
        <Spacer y={0.5} />
        <Text>Details:</Text>
        <Spacer y={0.25} />
        <Container row>
          <Text color="helper">{message.error.detail}</Text>
        </Container>
        <Spacer y={0.5} />
        <Text>Resolution steps:</Text>
        <Spacer y={0.25} />
        <Container row>
          <Text color="helper">{message.error.mitigation_steps}</Text>
        </Container>
        <Spacer y={0.25} />
        <Container row>
          <Text color="helper">Need help troubleshooting?</Text>
          <Spacer inline x={0.5} />
          <Button
            onClick={() => {
              showIntercomWithMessage({
                message: `I need help troubleshooting an issue with my application ${appName} in project ${projectId}.`,
                delaySeconds: 0,
              });
            }}
          >
            <img src={chat} style={{ width: "15px", marginRight: "10px" }} />
            Talk to support
          </Button>
        </Container>
        {message.error.documentation.length > 0 && (
          <>
            <Spacer y={0.5} />
            <Text>Relevant documentation:</Text>
            <Spacer y={0.25} />
            <ul
              style={{
                paddingInlineStart: "12px",
                marginTop: "0px",
              }}
            >
              {message.error.documentation.map((doc, i) => {
                return (
                  <li key={i}>
                    <a href={doc} target="_blank" rel="noreferrer">
                      {doc}
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {service.config.type === "job" && message.metadata.job_run_id && (
          <Container row>
            <Tag>
              <Link
                to={linkToTabGenerator({
                  tab: "job-history",
                  queryParams: {
                    job_run_id: message.metadata.job_run_id,
                    service: service.name.value,
                  },
                })}
              >
                <Text size={16}>Job run</Text>
                <i
                  className="material-icons"
                  style={{
                    fontSize: "16px",
                    marginLeft: "5px",
                  }}
                >
                  open_in_new
                </i>
              </Link>
            </Tag>
          </Container>
        )}
        {service.config.type !== "job" && message.error.should_view_logs && (
          <>
            <Container row>
              <Tag>
                <i className="material-icons-outlined">
                  {logsVisible ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
                <Link
                  onClick={() => {
                    setLogsVisible(!logsVisible);
                  }}
                >
                  <Text size={16}>Logs</Text>
                </Link>
              </Tag>
            </Container>
            <CollapsibleContainer isOpened={logsVisible}>
              <Spacer y={0.5} />
              <Logs
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                serviceNames={serviceNames}
                deploymentTargetId={deploymentTargetId}
                appRevisionId={appRevisionId}
                logFilterNames={["service_name"]}
                appId={appId}
                selectedService={serviceNames[0]}
                selectedRevisionId={appRevisionId}
                defaultScrollToBottomEnabled={false}
                timeRange={
                  showLiveLogs
                    ? undefined
                    : {
                        startTime: dayjs(message.timestamp).subtract(
                          1,
                          "minute"
                        ),
                        endTime: dayjs(message.timestamp).add(1, "minute"),
                      }
                }
              />
            </CollapsibleContainer>
          </>
        )}
      </Message>
    </NotificationWrapper>
  );
};

export default ServiceMessage;
