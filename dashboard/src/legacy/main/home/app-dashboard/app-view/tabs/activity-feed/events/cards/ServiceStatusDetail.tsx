import React from "react";
import alert from "legacy/assets/alert-warning.svg";
import metrics from "legacy/assets/bar-group-03.svg";
import calendar from "legacy/assets/calendar-02.svg";
import document from "legacy/assets/document.svg";
import link from "legacy/assets/external-link.svg";
import job from "legacy/assets/job.png";
import web from "legacy/assets/web.png";
import worker from "legacy/assets/worker.png";
import Icon from "legacy/components/porter/Icon";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Tag from "legacy/components/porter/Tag";
import Text from "legacy/components/porter/Text";
import { isClientServiceNotification } from "legacy/lib/porter-apps/notification";
import { prefixSubdomain } from "legacy/lib/porter-apps/services";
import styled from "styled-components";
import { match } from "ts-pattern";

import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

import { getStatusColor, getStatusIcon } from "../utils";

type Props = {
  serviceDeploymentMetadata: Record<
    string,
    {
      status: string;
      type: string;
    }
  >;
  revisionId: string;
  revisionNumber?: number;
};

const ServiceStatusDetail: React.FC<Props> = ({
  serviceDeploymentMetadata,
  revisionId,
  revisionNumber = 0,
}) => {
  const { latestClientServices, latestClientNotifications, tabUrlGenerator } =
    useLatestRevision();
  const convertEventStatusToCopy = (status: string): string => {
    switch (status) {
      case "PROGRESSING":
        return "DEPLOYING";
      case "SUCCESS":
        return "DEPLOYED";
      case "FAILED":
        return "FAILED";
      case "CANCELED":
        return "CANCELED";
      default:
        return "UNKNOWN";
    }
  };

  return (
    <ServiceStatusTable>
      <tbody>
        {Object.keys(serviceDeploymentMetadata).map((key) => {
          const { status: serviceStatus, type: serviceType } =
            serviceDeploymentMetadata[key];
          const service = latestClientServices.find(
            (s) => s.name.value === key
          );
          const externalUri =
            service != null &&
            service.config.type === "web" &&
            service.config.domains.length
              ? service.config.domains[0].name.value
              : "";
          const notificationsExistForService = latestClientNotifications
            .filter(isClientServiceNotification)
            .some(
              (n) =>
                n.service.name.value === key && n.appRevisionId === revisionId
            );
          return (
            <ServiceStatusTableRow key={key}>
              <ServiceStatusTableData width={"200px"}>
                {match(serviceType)
                  .with("web", () => <Icon src={web} height="14px" />)
                  .with("worker", () => <Icon src={worker} height="14px" />)
                  .with("job", () => <Icon src={job} height="14px" />)
                  .otherwise(() => null)}
                <Spacer inline x={0.5} />
                <Text>{key}</Text>
              </ServiceStatusTableData>
              <ServiceStatusTableData width={"120px"}>
                <Icon height="12px" src={getStatusIcon(serviceStatus)} />
                <Spacer inline x={0.5} />
                <Text color={getStatusColor(serviceStatus)}>
                  {convertEventStatusToCopy(serviceStatus)}
                </Text>
              </ServiceStatusTableData>
              <ServiceStatusTableData>
                <>
                  {notificationsExistForService && (
                    <>
                      <Tag borderColor="#FFBF00">
                        <Link
                          to={tabUrlGenerator({
                            tab: "notifications",
                            queryParams: {
                              service: key,
                            },
                          })}
                          color={"#FFBF00"}
                        >
                          <TagIcon src={alert} />
                          Notifications
                        </Link>
                      </Tag>
                      <Spacer inline x={0.5} />
                    </>
                  )}
                  {serviceType !== "job" && revisionNumber !== 0 && (
                    <>
                      <Tag>
                        <Link
                          to={tabUrlGenerator({
                            tab: "logs",
                            queryParams: {
                              version: revisionNumber.toString(),
                              service: key,
                            },
                          })}
                        >
                          <TagIcon src={document} />
                          Logs
                        </Link>
                      </Tag>
                      <Spacer inline x={0.5} />
                      <Tag>
                        <Link
                          to={tabUrlGenerator({
                            tab: "metrics",
                            queryParams: {
                              service: key,
                            },
                          })}
                        >
                          <TagIcon src={metrics} />
                          Metrics
                        </Link>
                      </Tag>
                    </>
                  )}
                  {serviceType === "job" && (
                    <Tag>
                      <TagIcon src={calendar} style={{ marginTop: "2px" }} />
                      <Link
                        to={tabUrlGenerator({
                          tab: "job-history",
                          queryParams: {
                            service: key,
                          },
                        })}
                      >
                        History
                      </Link>
                    </Tag>
                  )}
                  {externalUri !== "" && (
                    <>
                      <Spacer inline x={0.5} />
                      <Tag>
                        <Link
                          to={prefixSubdomain(externalUri)}
                          target={"_blank"}
                          showTargetBlankIcon={false}
                        >
                          <TagIcon src={link} height={"10px"} />
                          External link
                        </Link>
                      </Tag>
                    </>
                  )}
                </>
              </ServiceStatusTableData>
            </ServiceStatusTableRow>
          );
        })}
      </tbody>
    </ServiceStatusTable>
  );
};

export default ServiceStatusDetail;

const ServiceStatusTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const ServiceStatusTableRow = styled.tr`
  display: flex;
  align-items: center;
  > td:last-child {
    border-right: none;
  }
`;

const ServiceStatusTableData = styled.td<{
  width?: string;
}>`
  padding: 8px 10px;
  display: flex;
  align-items: center;
  border-right: 2px solid #ffffff11;
  ${(props) => props.width && `width: ${props.width};`}
`;

const TagIcon = styled.img<{ height?: string }>`
  height: ${(props) => props.height ?? "12px"};
  margin-right: 3px;
`;
